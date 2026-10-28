"""Synthetic acceptance/rejection tests; no game, capture or human approval."""
import copy
import json
from capture_record import validate, unique_object


def main():
    base = {'schema': 'darkdungeon-capture-classification-v1', 'capture_id': 'synthetic',
            'comparison_class': 'layout-only', 'conformance': 'non-conforming-reference',
            'role': 'phase0', 'reason': 'R6 validation pending',
            'approval_record': {'status': 'pending', 'author': None, 'date': None,
                                'style_guide_version': None, 'style_guide_sha256': None,
                                'scope': 'phase0-baseline', 'reason': 'Not reviewed'}}
    accepted = rejected = 0

    def accept(value):
        nonlocal accepted
        validate(value)
        accepted += 1

    def reject(value, expected=None):
        nonlocal rejected
        try:
            validate(value)
        except ValueError as error:
            if expected is not None:
                assert str(error) == expected, (str(error), expected)
            rejected += 1
        else:
            raise AssertionError('Invalid record accepted: ' + repr(value))

    accept(base)
    for field in base:
        value = copy.deepcopy(base)
        del value[field]
        reject(value)
    for field in base['approval_record']:
        value = copy.deepcopy(base)
        del value['approval_record'][field]
        reject(value)
    for field in ('comparison_class', 'conformance', 'role'):
        for invalid in ('unknown', None, [], {}, True, 1):
            value = copy.deepcopy(base)
            value[field] = invalid
            reject(value)
    for field, invalid in (('status', 'pass'), ('status', []), ('scope', 'style-guide'),
                           ('author', 'invented'), ('date', '2026-10-28'),
                           ('style_guide_version', 'v1'), ('style_guide_sha256', 'a'*64),
                           ('reason', ''), ('reason', None)):
        value = copy.deepcopy(base)
        value['approval_record'][field] = invalid
        reject(value)
    for invalid in (None, [], True, '', ' '):
        value = copy.deepcopy(base)
        value['reason'] = invalid
        reject(value)
    value = copy.deepcopy(base)
    value['approval_record'].update(status='approved', author='Synthetic reviewer',
                                    date='2026-10-28', reason=None)
    reject(value)  # nonconforming cannot become the accepted baseline
    value['conformance'] = 'conforming'
    value['reason'] = None
    accept(value)
    for invalid in ('2026-02-30', '20261028', True, None):
        bad = copy.deepcopy(value)
        bad['approval_record']['date'] = invalid
        reject(bad)
    value['role'] = 'phase2'
    value['approval_record']['scope'] = 'style-guide'
    reject(value)  # no bound style guide
    value['approval_record'].update(style_guide_version='synthetic-v1', style_guide_sha256='a'*64)
    accept(value)
    for invalid in ('', 'a'*63, 'z'*64, True, None):
        bad = copy.deepcopy(value)
        bad['approval_record']['style_guide_sha256'] = invalid
        reject(bad)
    value['role'] = 'phase3-4'
    value['approval_record']['scope'] = 'motion-comparison'
    accept(value)
    value = copy.deepcopy(base)
    value.update(role='history', comparison_class='advisory-unpaired')
    value['approval_record']['scope'] = 'historical-reference'
    accept(value)
    value['conformance'] = 'conforming'
    reject(value)
    value = copy.deepcopy(base)
    value['approval_record'].update(status='rejected', author='Synthetic reviewer', date='2026-10-28')
    accept(value)
    value['approval_record']['reason'] = None
    reject(value)
    for field, invalid, reason in (
            ('schema', 'unknown', 'unknown schema'),
            ('capture_id', '', 'capture_id required'),
            ('capture_id', False, 'capture_id required'),
            ('approval_record', [], 'approval fields missing or unknown'),
            ('extra', 'value', 'classification fields missing or unknown')):
        bad = copy.deepcopy(base)
        bad[field] = invalid
        reject(bad, reason)
    bad = copy.deepcopy(base)
    bad['approval_record']['extra'] = 'value'
    reject(bad, 'approval fields missing or unknown')
    for role, scope, comparison in (
            ('history', 'historical-reference', 'advisory-unpaired'),
            ('phase0', 'phase0-baseline', 'layout-only'),
            ('geometry', 'geometry-measurement', 'layout-only')):
        bad = copy.deepcopy(base)
        bad.update(role=role, comparison_class=comparison)
        bad['approval_record'].update(status='approved', author='Synthetic reviewer',
                                     date='2026-10-28', scope=scope,
                                     style_guide_version='synthetic', style_guide_sha256='a'*64)
        reject(bad, 'reference/baseline cannot approve style')
    for version, digest in ((None, 'a'*64), ('synthetic', None), ('synthetic', 'A'*64)):
        bad = copy.deepcopy(base)
        bad.update(role='phase2', conformance='conforming')
        bad['approval_record'].update(status='approved', author='Synthetic reviewer',
                                     date='2026-10-28', scope='style-guide',
                                     style_guide_version=version, style_guide_sha256=digest)
        reject(bad, 'style version and SHA must be a complete pair')
    for raw in ('{"role":"phase0","role":"phase2"}',
                '{"approval_record":{"status":"pending","status":"approved"}}'):
        try:
            json.loads(raw, object_pairs_hook=unique_object)
        except ValueError:
            rejected += 1
        else:
            raise AssertionError('Duplicate JSON keys accepted')
    assert (accepted, rejected) == (6, 73), (accepted, rejected)
    print(json.dumps({'accepted_synthetic_cases': accepted, 'rejected_synthetic_cases': rejected,
                      'game_executed': False, 'captures_created': 0,
                      'human_approvals_created': 0, 'runtime_ready': False}))


if __name__ == '__main__':
    main()
