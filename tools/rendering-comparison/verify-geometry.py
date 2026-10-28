"""Verify a rendered-widget geometry bundle, never certify a runtime baseline."""
import argparse
import hashlib
import json
from pathlib import Path
import math
import struct
import re
from capture_record import validate, unique_object, require


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'), object_pairs_hook=unique_object)


def verify(directory):
    geometry = read(directory / 'geometry.json')
    classification = read(directory / 'classification.json')
    validate(classification)
    require(geometry['schema'] == 'darkdungeon-geometry-capture-v1', 'unknown geometry schema')
    require(geometry['capture_id'] == classification['capture_id'] == directory.name, 'capture ID mismatch')
    require(classification['role'] == 'geometry'
            and classification['comparison_class'] == 'layout-only'
            and classification['conformance'] == 'non-conforming-reference'
            and classification['approval_record']['status'] == 'pending', 'diagnostic classification changed')
    for field in ('source_binding_verified', 'r5_r6_verified', 'runtime_ready'):
        require(geometry[field] is False, 'diagnostic cannot certify ' + field)
    require(geometry['language'] in ('en', 'ja'), 'unknown language')
    require(geometry['case_kind'] in ('manual-profile', 'assisted-smoke'), 'unknown assistance kind')
    require(isinstance(geometry['executable_sha256'], str)
            and re.fullmatch('[0-9a-f]{64}', geometry['executable_sha256']) is not None, 'invalid executable SHA')
    require(geometry['suite'] in ('G36', 'G48'), 'unknown suite')
    tile = int(geometry['suite'][1:])
    require(geometry['tile_logical'] == [tile, tile], 'tile mismatch')
    require(geometry['aligned_cell_capacity'] == [864 // tile, 432 // tile], 'cell capacity mismatch')
    x, y = geometry['scroll_pixels']
    require(type(x) is int and type(y) is int and x >= 0 and y >= 0, 'invalid scroll offset')
    maximum = geometry['scroll_maximum']
    require(len(maximum) == 2 and all(type(v) is int and v >= 0 for v in maximum)
            and x <= maximum[0] and y <= maximum[1], 'scroll outside range')
    complete = [(start + length) // tile - (start + tile - 1) // tile
                for start, length in ((x, 864), (y, 432))]
    require(geometry['complete_cells'] == complete, 'visible complete cell count mismatch')
    require(geometry['partial_edge_pixels_ltrb'] ==
            [tile - x % tile if x % tile else 0, tile - y % tile if y % tile else 0,
             (x + 864) % tile, (y + 432) % tile], 'partial cell edges mismatch')
    edges = geometry['partial_edge_pixels_ltrb']
    require(edges[0] + complete[0]*tile + edges[2] == 864
            and edges[1] + complete[1]*tile + edges[3] == 432, 'cell widths do not cover viewport')
    require(geometry['map_rect_logical'] == [0, 0, 864, 432], 'viewport must actually be 864x432')
    require(geometry['map_rect_in_client_logical'][2:] == [864, 432], 'client-relative viewport mismatch')
    client = geometry['client_rect_logical']
    require(len(client) == 4 and all(type(v) is int for v in client)
            and client[:2] == [0, 0] and client[2] > 0 and client[3] > 0, 'invalid client rectangle')
    left, top, width, height = geometry['map_rect_in_client_logical']
    require(left >= 0 and top >= 0 and left+width <= client[2] and top+height <= client[3], 'viewport outside client')
    require(geometry['os_scale_percent'] is None and bool(geometry['os_scale_reason']), 'OS scale must remain unmeasured')
    require(geometry['capture_backend'] == 'QWidget::grab (rendered widget, not desktop presentation)',
            'backend must not claim desktop presentation')
    for filename, field in (('client.png', 'client_pixels'), ('map.png', 'map_pixels')):
        raw = (directory / filename).read_bytes()
        require(hashlib.sha256(raw).hexdigest() == geometry['raw_media'][filename], 'media SHA mismatch')
        require(raw[:8] == b'\x89PNG\r\n\x1a\n' and raw[12:16] == b'IHDR', 'invalid PNG header')
        width, height = struct.unpack('>II', raw[16:24])
        require(geometry[field] == [0, 0, width, height], 'physical PNG dimensions mismatch')
    dpr = geometry['map_pixmap_dpr']
    require(type(dpr) in (int, float) and math.isfinite(dpr) and dpr > 0, 'invalid DPR')
    require(all(abs(p - logical * dpr) <= 1 for p, logical in
                zip(geometry['map_pixels'][2:], (864, 432))), 'map pixels disagree with logical size and DPR')
    client_dpr = geometry['qt_dpr']
    require(type(client_dpr) in (int, float) and math.isfinite(client_dpr) and client_dpr > 0,
            'invalid client DPR')
    require(all(abs(p - logical * client_dpr) <= 1 for p, logical in
                zip(geometry['client_pixels'][2:], client[2:])), 'client pixels disagree with DPR')
    require(set(geometry['unmeasured']) == {'phase_build_session_input_checkpoint',
            'source_generation_and_dirty_diff', 'data_asset_settings_sha256',
            'public_display_generation', 'input_publication_presentation_timing'}
            and all(isinstance(v, str) and v.strip() for v in geometry['unmeasured'].values()), 'missing unmeasured reasons')
    return {'capture_id': geometry['capture_id'], 'language': geometry['language'],
            'suite': geometry['suite'], 'geometry_and_media_valid': True,
            'desktop_presentation_verified': False, 'runtime_ready': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    try:
        result = verify(args.directory)
    except (ValueError, KeyError, TypeError, OSError, struct.error) as error:
        parser.exit(1, 'Invalid geometry bundle: ' + str(error) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
