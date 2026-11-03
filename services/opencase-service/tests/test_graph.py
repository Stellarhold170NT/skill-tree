"""Graph behavior: topological order, cycle rejection, prerequisite check, package export."""


def _setup_chain(client):
    """A(prereq) -> B -> C, plus one isPartOf taxonomy edge."""
    doc = client.post(
        "/api/v1/documents", json={"title": "CS101", "creator": "Faculty"}
    ).json()
    items = {}
    for name, scheme in (("Variables", "1.1"), ("Conditionals", "1.2"), ("Recursion", "1.3")):
        items[name] = client.post(
            f"/api/v1/documents/{doc['id']}/items",
            json={"fullStatement": name, "humanCodingScheme": scheme},
        ).json()

    for pre, dep in (("Variables", "Conditionals"), ("Conditionals", "Recursion")):
        resp = client.post(
            f"/api/v1/documents/{doc['id']}/associations",
            json={
                "associationType": "isPrerequisiteOf",
                "originItemId": items[pre]["id"],
                "destinationItemId": items[dep]["id"],
            },
        )
        assert resp.status_code == 201

    client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isPartOf",
            "originItemId": items["Variables"]["id"],
            "destinationItemId": items["Recursion"]["id"],
        },
    )
    return doc, items


def test_topological_order_prerequisites_first(client):
    doc, items = _setup_chain(client)
    resp = client.get(f"/api/v1/documents/{doc['id']}/topological-order")
    assert resp.status_code == 200
    order = [i["id"] for i in items.values()]
    identifiers = resp.json()["order"]
    # variables before conditionals before recursion
    assert identifiers.index(items["Variables"]["identifier"]) < identifiers.index(
        items["Conditionals"]["identifier"]
    )
    assert identifiers.index(items["Conditionals"]["identifier"]) < identifiers.index(
        items["Recursion"]["identifier"]
    )


def test_self_reference_prerequisite_rejected(client):
    doc, items = _setup_chain(client)
    resp = client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isPrerequisiteOf",
            "originItemId": items["Variables"]["id"],
            "destinationItemId": items["Variables"]["id"],
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "SELF_REFERENCE"


def test_cycle_rejected(client):
    doc, items = _setup_chain(client)
    # Recursion -> Variables would close the chain into a cycle.
    resp = client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isPrerequisiteOf",
            "originItemId": items["Recursion"]["id"],
            "destinationItemId": items["Variables"]["id"],
        },
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CYCLE_DETECTED"


def test_invalid_association_type_rejected(client):
    doc, items = _setup_chain(client)
    resp = client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isFriendOf",
            "originItemId": items["Variables"]["id"],
            "destinationItemId": items["Recursion"]["id"],
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ASSOCIATION_TYPE"


def test_check_prerequisites(client):
    doc, items = _setup_chain(client)
    url = f"/api/v1/documents/{doc['id']}/check-prerequisites"

    resp = client.post(
        url,
        json={"targetItemId": items["Recursion"]["id"], "masteredItemIds": [items["Variables"]["id"]]},
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["unlocked"] is False
    missing_ids = [m["id"] for m in body["missingPrerequisites"]]
    assert items["Conditionals"]["id"] in missing_ids

    resp = client.post(
        url,
        json={
            "targetItemId": items["Recursion"]["id"],
            "masteredItemIds": [items["Variables"]["id"], items["Conditionals"]["id"]],
        },
    )
    body = resp.json()
    assert body["unlocked"] is True
    assert body["missingPrerequisites"] == []


def test_package_and_graph_export(client):
    doc, items = _setup_chain(client)
    package = client.get(f"/api/v1/documents/{doc['id']}/package").json()
    assert package["@context"].startswith("https://purl.imsglobal.org/spec/case/")
    assert len(package["CFItems"]) == 3
    assert len(package["CFAssociations"]) == 3
    assert package["CFDocument"]["title"] == "CS101"

    graph = client.get(f"/api/v1/documents/{doc['id']}/graph").json()
    assert len(graph["nodes"]) == 3
    assert len(graph["edges"]) == 3
    types = {edge["type"] for edge in graph["edges"]}
    assert types == {"isPrerequisiteOf", "isPartOf"}
