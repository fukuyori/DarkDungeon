"""Synthetic scale provenance tests. Does not measure a Windows monitor."""
import copy
import json
from pathlib import Path
import runpy

validate = runpy.run_path(str(Path(__file__).with_name('verify-geometry.py')))['verify_os_scale']


def main():
    sample = {'status': 'measured', 'percent': 150, 'monitor': r'\\.\DISPLAY1',
              'hresult': '0x00000000', 'method': 'MonitorFromWindow/GetScaleFactorForMonitor', 'reason': None}
    base = {'schema': 'darkdungeon-geometry-capture-v2', 'os_scale_percent': 150, 'os_scale_reason': None,
            'os_scale_observation': {'before': copy.deepcopy(sample), 'after': copy.deepcopy(sample), 'stable': True}}
    passed = []

    def accepted(name, value):
        validate(value)
        passed.append('accept: ' + name)

    def rejected(name, value):
        try:
            validate(value)
        except ValueError:
            passed.append('reject: ' + name)
        else:
            raise AssertionError('Invalid scale accepted: ' + name)

    accepted('matching monitor and scale', base)
    value = copy.deepcopy(base)
    value['qt_dpr'] = 2.0
    accepted('Qt DPR need not equal OS factor', value)
    for field, invalid in (('percent', True), ('percent', 0), ('percent', -100), ('percent', 150.0),
                           ('percent', None), ('status', 'unknown'), ('hresult', '0x80004005'),
                           ('monitor', None), ('monitor', ''), ('method', 'Qt DPR'), ('reason', 'failure')):
        value = copy.deepcopy(base)
        value['os_scale_observation']['before'][field] = invalid
        rejected('invalid measured ' + field + '=' + str(invalid), value)
    for side in ('before', 'after'):
        value = copy.deepcopy(base)
        value['os_scale_observation'][side].update(status='unavailable', percent=None,
                                                   hresult='0x80004005', reason='query failed')
        value.update(os_scale_percent=None, os_scale_reason='query unavailable')
        value['os_scale_observation']['stable'] = False
        accepted(side + ' query failure remains unmeasured', value)
        value['os_scale_observation'][side]['percent'] = 100
        rejected(side + ' failure fallback cannot become measurement', value)
    for field, changed in (('monitor', r'\\.\DISPLAY2'), ('percent', 200)):
        value = copy.deepcopy(base)
        value['os_scale_observation']['after'][field] = changed
        rejected(field + ' change cannot stay stable', value)
        value.update(os_scale_percent=None, os_scale_reason='changed during capture')
        value['os_scale_observation']['stable'] = False
        accepted(field + ' change recorded as unmeasured', value)
    for field, invalid in (('os_scale_percent', True), ('os_scale_percent', 100),
                           ('os_scale_reason', 'unknown')):
        value = copy.deepcopy(base)
        value[field] = invalid
        rejected('inconsistent summary ' + field, value)
    value = copy.deepcopy(base)
    value['os_scale_observation']['stable'] = 1
    rejected('boolean/integer stability confusion', value)
    value = {'schema': 'darkdungeon-geometry-capture-v1', 'os_scale_percent': None, 'os_scale_reason': 'old format'}
    accepted('historical v1 stays readable', value)
    value['os_scale_percent'] = 100
    rejected('v1 must not invent measured scale', value)
    assert len(passed) == 27, len(passed)
    print(json.dumps({'checks': passed, 'monitor_measured': False, 'runtime_ready': False}))


if __name__ == '__main__':
    main()
