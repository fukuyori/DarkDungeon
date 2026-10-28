"""R6 lexical source census and proposed boundary registry, never runs a game.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/data/rendering-invariant-audit.json'
GROUPS = {
    'clock': r'\b(?:time|_time64|localtime|gmtime|mktime|getnow|yyyymmdd|yyyymmddhhmmss|sys_random_seed|init_random|reseed_random)\b',
    'sampling': r'\b(?:rn2_on_display_rng|newsym_rn2|obj_to_glyph|mon_to_glyph|what_mon|what_obj|random_obj_to_glyph|random_mon_to_glyph|display_self)\b',
    'publication': r'\b(?:show_glyph|print_glyph|PrintGlyph|tmp_at|shieldeff|flush_screen|map_glyphinfo|update_inventory)\b',
    'legacy_hook': r'\bdarkdungeon_note_attack\s*\(',
}
ROUTES = {
    'N01': [('hack.c','domove'),('monmove.c','m_move'),('dogmove.c','dog_move'),('teleport.c','rloc_to_core')],
    'N02': [('uhitm.c','do_attack'),('uhitm.c','hitum'),('uhitm.c','hmonas'),('dokick.c','dokick'),('apply.c','use_pole'),('apply.c','use_whip'),('zap.c','dozap'),('zap.c','weffects'),('dothrow.c','dofire'),('polyself.c','dobreathe'),('polyself.c','dospit'),('polyself.c','dogaze')],
    'N03': [('mhitu.c','mattacku'),('mhitm.c','mattackm'),('mhitu.c','getmattk')],
    'N04': [('dothrow.c','dothrow'),('mthrowu.c','m_throw'),('mthrowu.c','thrwmu'),('mthrowu.c','thrwmm'),('mthrowu.c','spitmu'),('mthrowu.c','spitmm'),('mthrowu.c','breamu')],
    'N05': [('spell.c','docast'),('mcastu.c','castmu'),('mcastu.c','buzzmu'),('mhitu.c','gazemu'),('mhitm.c','gazemm')],
    'N06': [('muse.c','use_defensive'),('muse.c','use_offensive'),('muse.c','use_misc'),('monmove.c','dochug')],
    'N07': [('uhitm.c','passive'),('mhitm.c','passivemm'),('mhitu.c','passiveum'),('mhitu.c','mdamageu'),('mhitm.c','mdamagem'),('mon.c','mondead'),('end.c','done')],
    'N08': [('display.c','tmp_at'),('display.c','shieldeff'),('zap.c','dobuzz'),('explode.c','explode')],
    'N09': [('display.c','newsym'),('display.c','display_monster'),('display.c','map_object'),('display.c','flush_screen')],
    'N10': [('do.c','goto_level'),('restore.c','dorecover'),('save.c','dosave0'),('display.c','clear_glyph_buffer')],
    'N11': [('allmain.c','moveloop_core'),('cmd.c','rhack'),('cmd.c','darkdungeon_basic_action')],
    'N12': [('teleport.c','teleds'),('dungeon.c','u_on_newpos'),('steed.c','mount_steed'),('steed.c','dismount_steed'),('polyself.c','polymon'),('polyself.c','rehumanize'),('mon.c','newcham'),('mhitu.c','gulpmu'),('mhitu.c','expels'),('mon.c','seemimic'),('potion.c','make_hallucinated')],
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean(source):
    # Preserve offsets/line numbers; this is a lexical census, not a C parser.
    pattern = r'/\*.*?\*/|//[^\n]*|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\''
    return re.sub(pattern, lambda m: ''.join('\n' if c == '\n' else ' ' for c in m[0]), source, flags=re.S)


def declarations(source):
    text = clean(source)
    records = []
    for match in re.finditer(r'\b(struct|union)\s+(\w+)\s*\{', text):
        depth, end = 1, match.end()
        while depth and end < len(text):
            depth += (text[end] == '{') - (text[end] == '}')
            end += 1
        if depth:
            raise ValueError('Unbalanced struct/union declaration')
        body = text[match.end():end-1]
        # Directives and inactive branches remain in the source census; no
        # assertion of compiled layout or leaf-by-leaf runtime binding is made.
        body = re.sub(r'^\s*#.*(?:\\\n.*)*$', lambda m: '\n' * m[0].count('\n'), body, flags=re.M)
        start, nesting = 0, 0
        members = []
        for index, char in enumerate(body):
            nesting += (char == '{') - (char == '}')
            if char == ';' and nesting == 0:
                value = ' '.join(body[start:index].split())
                if value:
                    members.append(value)
                start = index + 1
        if members:
            records.append({'kind':match[1], 'name':match[2], 'line':text.count('\n',0,match.start())+1,
                            'declarations':members, 'runtime_binding':'not-implemented'})
    return records


def collect():
    result = {'schema':'darkdungeon-invariant-audit-v1',
              'scope':'lexical references and declaration groups; includes inactive branches/prototypes; not a call graph',
              'runtime_ready':False, 'game_executed':False, 'languages':{}}
    for language, directory in (('en','build/nethack'),('ja','build/nethack-ja')):
        base = ROOT / directory
        paths = set()
        for folder in ('src','include','sys/windows','win/Qt'):
            paths.update(p for p in (base/folder).glob('*') if p.suffix in ('.c','.h','.cpp'))
        paths.update(p for p in (ROOT/'src').iterdir() if p.suffix in ('.c','.h','.cpp','.inc'))
        paths.add(ROOT/'scripts/prepare-source.ps1')
        paths.add(base/'src/Makefile')
        makefile = (base/'src/Makefile').read_text(encoding='utf-8-sig')
        joined_makefile = re.sub(r'\\\r?\n',' ',makefile)
        qt_objects = re.search(r'^QT_OBJS\s*=([^\n]+)',joined_makefile,re.M).group(1)
        if 'qt_druaga.o' in qt_objects:
            raise ValueError('Obsolete Druaga source entered QT_OBJS; reassess its scope')
        hashes, references, fields, scopes = {}, [], [], {}
        for path in sorted(paths):
            relative = path.relative_to(ROOT).as_posix()
            hashes[relative] = sha(path)
            scopes[relative] = ('hash-only-generation-input' if path.suffix == '.ps1' or path.name == 'Makefile' else
                'not-linked-in-current-QT_OBJS' if path.stem == 'qt_druaga' else 'lexical-census; effective compilation not established')
            if scopes[relative] == 'hash-only-generation-input':
                continue
            source = path.read_text(encoding='utf-8-sig', errors='strict')
            text = clean(source)
            for group, pattern in GROUPS.items():
                for match in re.finditer(pattern, text):
                    references.append({'group':group,'path':relative,'line':text.count('\n',0,match.start())+1,'token':match[0].strip()})
            if path.suffix in ('.c','.h'):
                for record in declarations(source):
                    fields.append({'path':relative,**record})
        anchors = {}
        for key, routes in ROUTES.items():
            entries = []
            for filename, function in routes:
                path = ROOT/filename[1:] if filename.startswith('@') else base/'src'/filename
                text = clean(path.read_text(encoding='utf-8-sig'))
                found = re.search(r'^'+re.escape(function)+r'\s*\(', text, re.M)
                if not found:
                    raise ValueError(f'Missing audited route {language}:{filename}:{function}')
                entries.append({'path':path.relative_to(ROOT).as_posix(),'function':function,'line':text.count('\n',0,found.start())+1,
                                'notification_implementation':'planned; existing legacy hooks are not accepted coverage'})
            anchors[key] = entries
        result['languages'][language] = {'source_hashes':hashes,'source_scopes':scopes,'references':references,'routes':anchors,'declaration_groups':fields,
            'counts':{'files':len(hashes),'references':len(references),'route_groups':len(anchors),'struct_union_groups':len(fields),'member_declarations':sum(len(f['declarations']) for f in fields)}}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    result = collect()
    encoded = json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if args.check:
        if OUT.read_text(encoding='utf-8-sig') != encoded:
            raise ValueError('Source census changed; inspect and regenerate the R6 evidence')
    else:
        OUT.write_text(encoded,encoding='utf-8')
    print(json.dumps({'mode':'check' if args.check else 'generate','created_utc':datetime.now(timezone.utc).isoformat(),
        'audit_sha256':sha(OUT),'tool_sha256':sha(Path(__file__)), 'counts':{k:v['counts'] for k,v in result['languages'].items()},
        'runtime_ready':False,'game_executed':False},indent=2))


if __name__ == '__main__':
    main()
