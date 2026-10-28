"""Validate R7 capture classification and approval metadata, not runtime evidence.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re

CLASSES = {'paired-controlled-public-scene', 'layout-only',
           'advisory-unpaired', 'renderer-support'}
ROLES = {'history', 'phase0', 'geometry', 'phase2', 'phase3-4'}
APPROVAL_FIELDS = {'status', 'author', 'date', 'style_guide_version',
                   'style_guide_sha256', 'scope', 'reason'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def member(value, choices):
    return isinstance(value, str) and value in choices


def validate(record):
    """Validate a classification sidecar. No media/build/RNG approval is inferred."""
    require(isinstance(record, dict), 'record must be an object')
    require(set(record) == {'schema', 'capture_id', 'comparison_class',
                           'conformance', 'role', 'reason', 'approval_record'},
            'classification fields missing or unknown')
    require(record['schema'] == 'darkdungeon-capture-classification-v1', 'unknown schema')
    require(text(record['capture_id']), 'capture_id required')
    require(member(record['comparison_class'], CLASSES), 'unknown comparison_class')
    require(member(record['role'], ROLES), 'unknown role')
    require(member(record['conformance'], {'conforming', 'non-conforming-reference'}),
            'unknown conformance')
    require(record['reason'] is None or text(record['reason']), 'invalid reason')
    if record['conformance'] == 'non-conforming-reference':
        require(text(record['reason']), 'reference requires reason')
    if record['role'] == 'history':
        require(record['comparison_class'] == 'advisory-unpaired'
                and record['conformance'] == 'non-conforming-reference',
                'history must remain an unpaired reference')
    approval = record['approval_record']
    require(isinstance(approval, dict) and set(approval) == APPROVAL_FIELDS,
            'approval fields missing or unknown')
    require(member(approval['status'], {'pending', 'approved', 'rejected'}),
            'unknown approval status')
    # Scope is recorded explicitly; a phase0 baseline is never a style guide.
    expected_scope = {'history': 'historical-reference', 'phase0': 'phase0-baseline',
                      'geometry': 'geometry-measurement', 'phase2': 'style-guide',
                      'phase3-4': 'motion-comparison'}[record['role']]
    require(approval['scope'] == expected_scope, 'approval scope does not match role')
    require(approval['reason'] is None or text(approval['reason']), 'invalid approval reason')
    if approval['status'] == 'pending':
        require(all(approval[k] is None for k in ('author', 'date',
                    'style_guide_version', 'style_guide_sha256')),
                'pending approval must not invent approval identity or style')
        require(text(approval['reason']), 'pending approval requires reason')
    else:
        require(text(approval['author']), 'decision author required')
        require(isinstance(approval['date'], str)
                and re.fullmatch(r'\d{4}-\d{2}-\d{2}', approval['date']) is not None,
                'decision date must be ISO calendar date')
        try:
            date.fromisoformat(approval['date'])
        except ValueError as error:
            raise ValueError('invalid decision date') from error
        if approval['status'] == 'rejected':
            require(text(approval['reason']), 'rejection requires reason')
        version, digest = approval['style_guide_version'], approval['style_guide_sha256']
        require((version is None and digest is None)
                or (text(version) and isinstance(digest, str)
                    and re.fullmatch(r'[0-9a-f]{64}', digest) is not None),
                'style version and SHA must be a complete pair')
        if record['role'] in {'history', 'phase0', 'geometry'}:
            require(version is None and digest is None, 'reference/baseline cannot approve style')
        if approval['status'] == 'approved' and record['role'] in {'phase2', 'phase3-4'}:
            require(version is not None, 'style or motion approval requires style binding')
        if approval['status'] == 'approved' and record['role'] == 'phase0':
            require(record['conformance'] == 'conforming', 'nonconforming record cannot be baseline')


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate JSON key: ' + key)
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', type=Path)
    args = parser.parse_args()
    raw = args.record.read_bytes()
    try:
        record = json.loads(raw.decode('utf-8-sig'), object_pairs_hook=unique_object)
        validate(record)
    except (ValueError, TypeError) as error:
        parser.exit(1, 'Invalid capture classification: ' + str(error) + '\n')
    print(json.dumps({'classification_valid': True, 'capture_id': record['capture_id'],
                      'record_sha256': hashlib.sha256(raw).hexdigest(),
                      'evidence_verified': False, 'runtime_ready': False,
                      'approval_authenticity_verified': False}))


if __name__ == '__main__':
    main()
