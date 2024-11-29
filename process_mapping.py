import csv
import os
import json

script_dir = os.path.dirname(__file__)
file_path = os.path.join(script_dir, "ontology_mapping.csv")
extraction_variables: dict[str, dict] = {}
hierarchy: list[dict] = []
ontology: dict[str, dict] = {}
PICO = ["Population", "Outcome"]


def populate_ontology(
    ontology_mapping,
):
    for mapping in ontology_mapping:
        if mapping["Class ID"] not in ontology:
            ontology[mapping["Class ID"]] = {
                "label": mapping["Class  label"],
                "definition": mapping["Class definition"],
                "variables": set(
                    [
                        (
                            mapping["Variable to extract"],
                            mapping["Understandable label for database"],
                        )
                    ]
                )
                if mapping["Variable to extract"]
                else set(),
            }
        else:
            ontology[mapping["Class ID"]]["variables"].add(
                (
                    mapping["Variable to extract"],
                    mapping["Understandable label for database"],
                )
            )


def get_current_variables(current_mapping, node_classes, parent):
    current_variables = ontology[node_classes[0]]["variables"]

    if current_mapping["Is part of COMBO."]:
        current_variables = [
            ontology[class_id]["variables"] for class_id in node_classes
        ]

        current_variables = list(
            set(current_variables[0]).intersection(*current_variables[1:])
        )
    elif parent["variables"]:
        current_variables = list(
            filter(
                lambda variable: variable in parent["variables"],
                current_variables,
            )
        )

    return current_variables


def run():
    with open(file_path, mode="r", encoding="utf-8") as csvfile:
        ontology_mapping = list(csv.DictReader(csvfile))

        populate_ontology(ontology_mapping)

        def append_children(node: dict):
            key = node["key"].strip()
            for mapping in ontology_mapping:
                if mapping["Organised under"].strip() == key:
                    child_key = (
                        mapping["Is part of COMBO."] or mapping["Class ID"]
                    ).strip()

                    current_children = [child["key"] for child in node["children"]]

                    if child_key not in current_children:
                        classes = child_key.split(",")
                        child_label = " - ".join(
                            [ontology[class_id]["label"] for class_id in classes]
                        )

                        current_variables = get_current_variables(
                            mapping, classes, node
                        )

                        current_node = {
                            "key": child_key,
                            "label": child_label,
                            "variables": list(current_variables),
                            "children": [],
                        }
                        node["children"].append(current_node)
                        ontology_mapping.remove(mapping)
                        append_children(current_node)

        for category in PICO:
            current_node = {
                "key": category,
                "label": category,
                "variables": [],
                "children": [],
            }
            hierarchy.append(current_node)
            append_children(current_node)

        with open("frontend/src/data/mapping.json", "w") as json_file:
            json.dump(hierarchy, json_file, indent=2)


run()
