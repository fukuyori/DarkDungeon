"""List 24 required layout cases and reference observations, without passing a gate."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import runpy

from contract import layout_matrix

geometry_module = runpy.run_path(str(Path(__file__).with_name('verify-geometry.py')))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, action='append', default=[])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    rows = layout_matrix()
    for row in rows:
        row.update(status='not-run', reason='Full layout-case evidence has not been verified',
                   geometry_reference_ids=[])
    observations = []
    ids = set()
    for directory in args.bundle:
        verified = geometry_module['verify'](directory)
        record = geometry_module['read'](directory/'geometry.json')
        capture_id = record['capture_id']
        if capture_id in ids:
            parser.error('Duplicate capture ID: ' + capture_id)
        ids.add(capture_id)
        matches = []
        for row in rows:
            same_size = (record['maximized'] is True if row['window_profile'] == 'maximized'
                         else record['maximized'] is False and
                         record['client_rect_logical'][2:] == row['requested_client_logical_px'])
            if (row['language'] == record['language'] and same_size
                    and type(record['os_scale_percent']) is int
                    and row['OS_scale_percent'] == record['os_scale_percent']):
                matches.append(row['id'])
                row['geometry_reference_ids'].append(capture_id)
        observations.append({'capture_id': capture_id, 'bundle': str(directory.resolve()),
            'geometry_sha256': hashlib.sha256((directory/'geometry.json').read_bytes()).hexdigest(),
            'classification_sha256': hashlib.sha256((directory/'classification.json').read_bytes()).hexdigest(),
            'language': record['language'], 'case_kind': record['case_kind'], 'suite': record['suite'],
            'client_logical_px': record['client_rect_logical'][2:], 'os_scale_percent': record['os_scale_percent'],
            'qt_dpr': record['qt_dpr'], 'matching_case_ids': matches,
            'geometry_and_media_valid': verified['geometry_and_media_valid'],
            'full_layout_case_passed': False,
            'reason': 'Geometry reference only; UI scene coverage, desktop capture, source binding and R5/R6 remain unverified'})
    output = {'schema': 'darkdungeon-layout-progress-v1', 'created_utc': datetime.now(timezone.utc).isoformat(),
              'tool_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'required_cases': rows, 'reference_observations': observations,
              'required_count': 24, 'passed_count': 0, 'runtime_ready': False}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Run-specific output must not replace an earlier progress observation.
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(output, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps({'required_count': 24, 'reference_count': len(observations),
                      'passed_count': 0, 'runtime_ready': False}))


if __name__ == '__main__':
    main()
