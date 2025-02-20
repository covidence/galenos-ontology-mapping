import csv
import os
import json
from merge_lsr_data import merge_files_into_json
from colorama import Fore, Style


def process_ontology_mapping(
    ontology_mapping,
) -> tuple[dict[str, dict], dict[str, list], dict[str, str]]:
    extraction_variables: dict[str, str] = {}
    ontology: dict[str, dict] = {}
    label_to_class: dict[str, list] = {}

    for mapping in ontology_mapping:
        class_id = mapping["Class ID"].strip()
        extraction_variable = mapping["Variable to extract"].strip()
        variable_label = mapping["Understandable label for database"].strip()

        if class_id not in ontology:
            ontology[class_id] = {
                "label": mapping["Class  label"],
                "definition": mapping["Class definition"],
                "variables": set([variable_label]) if extraction_variable else set(),
            }
        else:
            ontology[class_id]["variables"].add(variable_label)

        if variable_label:
            if variable_label not in label_to_class:
                label_to_class[variable_label] = [class_id]
            else:
                if class_id not in label_to_class[variable_label]:
                    label_to_class[variable_label].append(class_id)

        if extraction_variable not in extraction_variables:
            extraction_variables[extraction_variable] = mapping[
                "Understandable label for database"
            ]

    return ontology, label_to_class, extraction_variables


def get_current_variables(current_mapping, parent, ontology_mapping_copy):
    variables = set()

    mapping_key = (current_mapping["COMBO"] or current_mapping["Class ID"]).strip()

    for mapping in ontology_mapping_copy:
        current_mapping_key = (mapping["COMBO"] or mapping["Class ID"]).strip()
        if (
            mapping_key == current_mapping_key
            and mapping["Organised under"] == parent["key"]
        ):
            variable = mapping["Understandable label for database"].strip()
            if variable:
                variables.add(variable)

    return variables


def get_ontology_items(classes: list, ontology: dict):
    return [
        {
            "id": stripped_id,
            "label": ontology[stripped_id]["label"],
            "definition": ontology[stripped_id]["definition"],
        }
        for class_id in classes
        if (stripped_id := class_id.strip())
    ]


def append_children(node: dict, ontology_mapping: list, ontology: dict):
    key = node["key"].strip()
    for mapping in ontology_mapping:
        is_child = mapping["Organised under"].strip() == key
        if is_child:
            child_key = (mapping["COMBO"] or mapping["Class ID"]).strip()

            current_children = [child["key"] for child in node["children"]]

            if child_key not in current_children:
                classes = child_key.split(",")
                child_label = " - ".join(
                    [ontology[class_id.strip()]["label"] for class_id in classes]
                )

                # find variables for current node
                current_variables = get_current_variables(
                    mapping, node, ontology_mapping
                )

                current_node = {
                    "key": child_key,
                    "classes": get_ontology_items(classes, ontology),
                    "label": child_label,
                    "variables": list(current_variables),
                    "children": [],
                }
                node["children"].append(current_node)
                ontology_mapping.remove(mapping)
                append_children(current_node, ontology_mapping, ontology)


# get all unique variables in entire hierarchy
def get_all_variables(node):
    all_variables = set()
    for child in node["children"]:
        all_variables.update(child["variables"])
        all_variables.update(get_all_variables(child))
    return all_variables


def print_leftover_variables(hierarchy, label_to_class):
    hierarchy_variables = set()
    for node in hierarchy:
        hierarchy_variables.update(get_all_variables(node))

    print(
        Fore.RED + "Mapped variables not included in hierarchy:",
        set(label_to_class.keys()) - hierarchy_variables,
        Style.RESET_ALL,
    )


def process_mapping(
    script_dir,
) -> tuple[dict[str, dict], dict[str, list], dict[str, str], list[dict]]:
    hierarchy: list[dict] = []
    file_path = os.path.join(script_dir, "ontology_mapping.csv")
    output_path = "frontend/src/data/mapping.json"

    with open(file_path, mode="r", encoding="utf-8") as csvfile:
        ontology_mapping = list(csv.DictReader(csvfile))

        print("Parsing ontology classes and mapping of extraction variables...")
        ontology, label_to_class, extraction_variables = process_ontology_mapping(
            ontology_mapping
        )

        PICO = ["Population", "Intervention", "Outcome", "Research methods"]

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
            ontology_mapping_copy = ontology_mapping.copy()
            append_children(current_node, ontology_mapping_copy, ontology)

        with open(os.path.join(script_dir, output_path), "w") as json_file:
            json.dump(hierarchy, json_file, indent=2)
            print(f"Hierarchy saved to {output_path}")

    return ontology, label_to_class, extraction_variables, hierarchy


def store_dictionary(script_dir, ontology, label_to_class):
    output_path = "frontend/src/data/dictionary.json"
    with open(os.path.join(script_dir, output_path), "w") as json_file:
        serializable_ontology = ontology.copy()

        for class_data in serializable_ontology.values():
            class_data["variables"] = list(class_data["variables"])

        dictionary = {
            "ontology": ontology,
            "label_to_class": label_to_class,
        }

        print("Storing dictionary...")
        json.dump(dictionary, json_file, indent=4)


def merge_lsr_data():
    directory_path = "./data"
    output_path = "./frontend/src/data/merged_data.json"
    lsr_files = {
        1: "df_amended_20240430.csv",
        2: "LSR2data_V1.csv",
        3: "LSR3_H_2024-01-22.xlsx",
    }

    print("Merging LSR data...")
    return merge_files_into_json(
        directory_path, lsr_files, output_path, extraction_variables
    )


def print_missing_columns(merged_data, label_to_class):
    missing_columns = set(label_to_class.keys()) - set(merged_data.columns)
    print(
        Fore.RED + "Columns not found in LSR extraction sheets:",
        missing_columns,
        Style.RESET_ALL,
    )


if __name__ == "__main__":
    script_dir = os.path.dirname(__file__)
    ontology, label_to_class, extraction_variables, hierarchy = process_mapping(
        script_dir
    )
    print_leftover_variables(hierarchy, label_to_class)
    store_dictionary(script_dir, ontology, label_to_class)
    merged_data = merge_lsr_data()

    print_missing_columns(merged_data, label_to_class)
