"""Extract static command metadata from preprocessed C; never runs the game.

DarkDungeon, 2026-10-27. See LICENSE. Input is produced from NetHack cmd.c;
the resulting catalogue remains subject to the same licence notices.
"""

import argparse
import ast
import hashlib
import json
import re
from pathlib import Path


def split_c_fields(text):
    fields, start, brackets, quote, escaped = [], 0, [], None, False
    for index, char in enumerate(text):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char in "([{":
            brackets.append(char)
        elif char in ")]}":
            if not brackets or brackets.pop() != {")": "(", "]": "[", "}": "{"}[char]:
                raise ValueError("Unbalanced C initializer")
        elif char == "," and not brackets:
            fields.append(text[start:index].strip())
            start = index + 1
    if quote or brackets:
        raise ValueError("Incomplete C initializer")
    final = text[start:].strip()
    if final:
        fields.append(final)
    return fields


def table_body(source):
    match = re.search(r"struct\s+ext_func_tab\s+extcmdlist\s*\[\s*\]\s*=\s*\{", source)
    if not match:
        raise ValueError("extcmdlist definition not found")
    start = match.end()
    depth, quote, escaped = 1, None, False
    for index in range(start, len(source)):
        char = source[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start:index]
    raise ValueError("extcmdlist terminator not found")


def c_string(expression):
    if re.fullmatch(r"[()\s*]*(?:void|char)?[()\s*]*0[()\s]*", expression):
        return None
    if not re.fullmatch(r'(?:\s*"(?:[^"\\]|\\.)*"\s*)+', expression):
        raise ValueError(f"Unexpected string expression: {expression}")
    return ast.literal_eval(expression)


def flag_value(expression):
    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return node.value
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
            return visit(node.left) | visit(node.right)
        raise ValueError(f"Unexpected flag expression: {expression}")

    expression = re.sub(r"\b(0x[0-9a-fA-F]+|[0-9]+)[uUlL]+\b", r"\1", expression)
    return visit(ast.parse(expression, mode="eval").body)


def extract(source):
    records, sentinel_seen = [], False
    for entry in split_c_fields(table_body(source)):
        if not entry.startswith("{") or not entry.endswith("}"):
            raise ValueError("Expected a six-field command initializer")
        fields = split_c_fields(entry[1:-1])
        if len(fields) != 6:
            raise ValueError(f"Expected six command fields, got {len(fields)}")
        command_id = c_string(fields[1])
        if command_id is None:
            sentinel_seen = True
            continue
        if sentinel_seen:
            raise ValueError("Command appears after sentinel")
        function = fields[3]
        if not re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", function):
            raise ValueError(f"Unexpected function expression: {function}")
        flags = flag_value(fields[4])
        category = (
            "internal" if flags & 0x0040 else
            "unavailable" if flags & 0x0010 else
            "privileged" if flags & 0x0004 else
            "prefix" if flags & 0x0200 else
            "parameterized" if flags & 0x4000 else
            "environment" if command_id in {"shell", "suspend", "bugreport"} else
            "normal"
        )
        records.append({
            "id": command_id,
            "description": c_string(fields[2]),
            "function": function,
            "flags": flags,
            "category": category,
        })
    if not sentinel_seen or not records:
        raise ValueError("Command table is missing its sentinel or is empty")
    if len({record["id"] for record in records}) != len(records):
        raise ValueError("Duplicate command IDs")
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    input_bytes = args.input.read_bytes()
    records = extract(input_bytes.decode("utf-8-sig"))
    result = {
        "kind": "static-source-audit-not-runtime-api",
        "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
        "commands": records,
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(records)} command definitions")


if __name__ == "__main__":
    main()
