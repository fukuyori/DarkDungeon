"""Mutate copies of a real diagnostic bundle to test rejection boundaries."""
import argparse
import json
from pathlib import Path
import runpy
import shutil
import tempfile

verify = runpy.run_path(str(Path(__file__).with_name('verify-geometry.py')))['verify']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    args = parser.parse_args()
    verify(args.bundle)
    mutations = [
        ('wrong viewport', lambda g: g.update(map_rect_logical=[0, 0, 863, 432])),
        ('wrong PNG hash', lambda g: g['raw_media'].update({'map.png': '0'*64})),
        ('wrong physical size', lambda g: g.update(map_pixels=[0, 0, 10, 10])),
        ('outside scroll range', lambda g: g.update(scroll_pixels=[999999, 999999])),
        ('wrong visible cells', lambda g: g.update(complete_cells=[999, 999])),
        ('wrong partial cells', lambda g: g.update(partial_edge_pixels_ltrb=[999]*4)),
        ('outside client', lambda g: g.update(map_rect_in_client_logical=[-1, 0, 864, 432])),
        ('empty executable SHA', lambda g: g.update(executable_sha256='')),
        ('unmeasured omitted', lambda g: g.update(unmeasured={})),
        ('NaN DPR', lambda g: g.update(map_pixmap_dpr=float('nan'))),
        ('false runtime claim', lambda g: g.update(runtime_ready=True)),
        ('wrong capture ID', lambda g: g.update(capture_id='other')),
    ]
    rejected = []
    with tempfile.TemporaryDirectory(prefix='darkdungeon-geometry-test-') as temporary:
        clone = Path(temporary) / args.bundle.name
        shutil.copytree(args.bundle, clone)
        original = (clone / 'geometry.json').read_text(encoding='utf-8')
        for name, mutate in mutations:
            value = json.loads(original)
            mutate(value)
            (clone / 'geometry.json').write_text(json.dumps(value), encoding='utf-8')
            try:
                verify(clone)
            except ValueError:
                rejected.append(name)
            else:
                raise AssertionError('Accepted corrupted bundle: ' + name)
    assert len(rejected) == 12
    print(json.dumps({'real_bundle_valid': True, 'rejected_mutations': rejected,
                      'game_executed_by_this_test': False, 'runtime_ready': False}))


if __name__ == '__main__':
    main()
