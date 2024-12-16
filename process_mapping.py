import csv
import os
import json
from merge_lsr_data import merge_files_into_json

extraction_variables: dict[str, str] = {
    "study_name": "Study name",
    "studlab": "Study name",
}
hierarchy: list[dict] = []
ontology: dict[str, dict] = {}

def populate_ontology(
    ontology_mapping,
):
    for mapping in ontology_mapping:
        if mapping["Class ID"] not in ontology:
            ontology[mapping["Class ID"]] = {
                "label": mapping["Class  label"],
                "definition": mapping["Class definition"],
                "variables": set([mapping["Understandable label for database"]])
                if mapping["Variable to extract"]
                else set(),
            }
        else:
            ontology[mapping["Class ID"]]["variables"].add(
                mapping["Understandable label for database"]
            )

        if mapping["Variable to extract"] not in extraction_variables:
            extraction_variables[mapping["Variable to extract"]] = mapping[
                "Understandable label for database"
            ]


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

def get_ontology_items(classes: list):
    return [
        {
            "id": class_id,
            "label": ontology[class_id]["label"],
            "definition": ontology[class_id]["definition"],
        }
        for class_id in classes
    ]


def append_children(node: dict, ontology_mapping: list):
    key = node["key"].strip()
    for mapping in ontology_mapping:
        if mapping["Organised under"].strip() == key:
            child_key = (mapping["Is part of COMBO."] or mapping["Class ID"]).strip()

            current_children = [child["key"] for child in node["children"]]

            if child_key not in current_children:
                classes = child_key.split(",")
                child_label = " - ".join(
                    [ontology[class_id]["label"] for class_id in classes]
                )

                current_variables = get_current_variables(mapping, classes, node)

                current_node = {
                    "key": child_key,
                    "classes": get_ontology_items(classes),
                    "label": child_label,
                    "variables": list(current_variables),
                    "children": [],
                }
                node["children"].append(current_node)
                ontology_mapping_copy = ontology_mapping.copy()
                ontology_mapping_copy.remove(mapping)
                append_children(current_node, ontology_mapping_copy)


def process_mapping():
    script_dir = os.path.dirname(__file__)
    file_path = os.path.join(script_dir, "ontology_mapping.csv")
    output_path = "frontend/src/data/mapping.json"

    with open(file_path, mode="r", encoding="utf-8") as csvfile:
        ontology_mapping = list(csv.DictReader(csvfile))

        print("Parsing ontology classes and mapping of extraction variables...")
        populate_ontology(ontology_mapping)

        PICO = ["Population", "Outcome"]

        print("Generating hierarchy...")
        for category in PICO:
            current_node = {
                "key": category,
                "classes": [],
                "label": category,
                "variables": [],
                "children": [],
            }
            hierarchy.append(current_node)
            append_children(current_node, ontology_mapping.copy())

        with open(os.path.join(script_dir, output_path), "w") as json_file:
            json.dump(hierarchy, json_file, indent=2)
            print(f"Hierarchy saved to {output_path}")


def merge_lsr_data():
    directory_path = "./data"
    output_path = "./frontend/src/data/merged_data.json"
    lsr_files = {1: "df_amended_20240430.csv", 3: "LSR3_H_2024-01-22.xlsx"}

    print("Merging LSR data...")
    merge_files_into_json(directory_path, lsr_files, output_path, extraction_variables)

if __name__ == "__main__":
    process_mapping()
    merge_lsr_data()
