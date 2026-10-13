#!/usr/bin/env python3
"""Convert a Wavefront OBJ mesh to a self-contained glTF 2.0 binary (GLB).

Uses only the Python standard library. Geometry, normals, and UVs are retained;
the source bundle does not include the original materials or textures.
"""
from __future__ import annotations

import argparse
import array
import json
import math
import struct
import sys
from pathlib import Path


def obj_index(raw: str, size: int) -> int:
    index = int(raw)
    resolved = index - 1 if index > 0 else size + index
    if resolved < 0 or resolved >= size:
        raise ValueError(f"OBJ index {index} is outside a list of {size} entries")
    return resolved


def face_normal(a, b, c):
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    n = (ab[1] * ac[2] - ab[2] * ac[1],
         ab[2] * ac[0] - ab[0] * ac[2],
         ab[0] * ac[1] - ab[1] * ac[0])
    length = math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2])
    return (n[0] / length, n[1] / length, n[2] / length) if length else (0.0, 1.0, 0.0)


def parse_obj(path: Path):
    positions, texcoords, normals = [], [], []
    vertices, uvs, vertex_normals, indices = [], [], [], []
    vertex_map = {}
    has_uv = False

    def add_vertex(corner, generated_normal, face_number):
        nonlocal has_uv
        vi, ti, ni = corner
        if ti is not None:
            has_uv = True
        # Missing normals are split per face to preserve flat shading.
        normal_key = ni if ni is not None else ("generated", face_number)
        key = (vi, ti, normal_key)
        if key not in vertex_map:
            vertex_map[key] = len(vertices)
            vertices.append(positions[vi])
            uvs.append(texcoords[ti] if ti is not None else (0.0, 0.0))
            vertex_normals.append(normals[ni] if ni is not None else generated_normal)
        return vertex_map[key]

    face_number = 0
    with path.open("r", encoding="utf-8", errors="strict") as source:
        for line_number, line in enumerate(source, 1):
            fields = line.strip().split()
            if not fields or fields[0].startswith("#"):
                continue
            kind, values = fields[0], fields[1:]
            try:
                if kind == "v":
                    if len(values) < 3:
                        raise ValueError("vertex needs three coordinates")
                    positions.append(tuple(float(v) for v in values[:3]))
                elif kind == "vt":
                    if len(values) < 2:
                        raise ValueError("texture coordinate needs two values")
                    texcoords.append(tuple(float(v) for v in values[:2]))
                elif kind == "vn":
                    if len(values) < 3:
                        raise ValueError("normal needs three coordinates")
                    normals.append(tuple(float(v) for v in values[:3]))
                elif kind == "f":
                    if len(values) < 3:
                        raise ValueError("face needs at least three corners")
                    corners = []
                    for value in values:
                        parts = value.split("/")
                        vi = obj_index(parts[0], len(positions))
                        ti = obj_index(parts[1], len(texcoords)) if len(parts) > 1 and parts[1] else None
                        ni = obj_index(parts[2], len(normals)) if len(parts) > 2 and parts[2] else None
                        corners.append((vi, ti, ni))
                    # Fan triangulation also handles non-triangle OBJ faces.
                    for offset in range(1, len(corners) - 1):
                        tri = (corners[0], corners[offset], corners[offset + 1])
                        n = face_normal(*(positions[c[0]] for c in tri))
                        indices.extend(add_vertex(c, n, face_number) for c in tri)
                        face_number += 1
            except (ValueError, IndexError) as exc:
                raise ValueError(f"{path}:{line_number}: {exc}") from exc

    if not vertices or not indices:
        raise ValueError(f"{path} contains no renderable triangles")
    return vertices, uvs, vertex_normals, indices, has_uv


def float_bytes(values):
    packed = array.array("f", (value for row in values for value in row))
    if sys.byteorder != "little":
        packed.byteswap()
    return packed.tobytes()


def uint_bytes(values):
    packed = array.array("I", values)
    if packed.itemsize != 4:
        return struct.pack("<" + "I" * len(values), *values)
    if sys.byteorder != "little":
        packed.byteswap()
    return packed.tobytes()


def make_glb(vertices, uvs, normals, indices, has_uv):
    blob = bytearray()
    buffer_views, accessors = [], []

    def append_view(data, target):
        while len(blob) % 4:
            blob.append(0)
        offset = len(blob)
        blob.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            view["target"] = target
        buffer_views.append(view)
        return len(buffer_views) - 1

    def add_accessor(view_index, component_type, count, shape, **extra):
        accessor = {"bufferView": view_index, "componentType": component_type,
                    "count": count, "type": shape}
        accessor.update(extra)
        accessors.append(accessor)
        return len(accessors) - 1

    position_view = append_view(float_bytes(vertices), 34962)
    mins = [min(vertex[i] for vertex in vertices) for i in range(3)]
    maxs = [max(vertex[i] for vertex in vertices) for i in range(3)]
    position_accessor = add_accessor(position_view, 5126, len(vertices), "VEC3", min=mins, max=maxs)

    normal_view = append_view(float_bytes(normals), 34962)
    normal_accessor = add_accessor(normal_view, 5126, len(normals), "VEC3")

    attributes = {"POSITION": position_accessor, "NORMAL": normal_accessor}
    if has_uv:
        uv_view = append_view(float_bytes(uvs), 34962)
        attributes["TEXCOORD_0"] = add_accessor(uv_view, 5126, len(uvs), "VEC2")

    index_view = append_view(uint_bytes(indices), 34963)
    index_accessor = add_accessor(index_view, 5125, len(indices), "SCALAR",
                                  min=[min(indices)], max=[max(indices)])

    document = {
        "asset": {"version": "2.0", "generator": "FPS Personal Database OBJ converter"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Delta Force collectible"}],
        "meshes": [{"name": "Extracted collectible mesh", "primitives": [{
            "attributes": attributes, "indices": index_accessor, "material": 0, "mode": 4
        }]}],
        "materials": [{"name": "Untextured neutral preview", "pbrMetallicRoughness": {
            "baseColorFactor": [0.78, 0.80, 0.84, 1.0], "metallicFactor": 0.12,
            "roughnessFactor": 0.66
        }, "doubleSided": True}],
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors
    }
    json_chunk = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((-len(json_chunk)) % 4)
    binary_chunk = bytes(blob) + b"\0" * ((-len(blob)) % 4)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    return (struct.pack("<4sII", b"glTF", 2, total_length)
            + struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
            + struct.pack("<I4s", len(binary_chunk), b"BIN\0") + binary_chunk)


def convert(source: Path, destination: Path):
    geometry = parse_obj(source)
    output = make_glb(*geometry)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(output)
    return len(geometry[0]), len(geometry[3]) // 3, len(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    vertices, triangles, size = convert(args.source, args.destination)
    print(f"{args.destination}: {vertices} vertices, {triangles} triangles, {size} bytes")


if __name__ == "__main__":
    main()
