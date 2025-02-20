import os
import pandas as pd


def translate_and_combine_columns(df, translation_dict):
    """
    Translates and combines columns in a DataFrame based on a translation dictionary.

    Parameters:
        df (pd.DataFrame): The input DataFrame.
        translation_dict (dict): A dictionary where keys are column names to be translated,
                                  and values are the new column name.

    Returns:
        pd.DataFrame: The modified DataFrame.
    """
    new_cols = {}  # Store new columns separately

    for original_col, translation in translation_dict.items():
        if original_col in df.columns:
            if translation in df.columns:
                raise ValueError(
                    f"Column name conflict: both {original_col} and {translation} are present."
                )
            new_cols[translation] = df[original_col]  # Collect new columns

    # Drop original columns
    df = df.drop(columns=translation_dict.keys(), errors="ignore")

    # Concatenate new columns efficiently
    return pd.concat([df, pd.DataFrame(new_cols)], axis=1, copy=False)


def read_file(filepath):
    """
    Reads a file (CSV or XLSX) into a pandas DataFrame.
    """
    if filepath.endswith(".csv"):
        return pd.read_csv(filepath, na_values=[], keep_default_na=False)
    elif filepath.endswith((".xls", ".xlsx")):
        return pd.read_excel(filepath, na_values=[], keep_default_na=False)
    else:
        raise ValueError(f"Unsupported file type for: {filepath}")


def merge_files_into_json(
    directory_path, lsr_files, output_json_path, extraction_variables
):
    """
    Reads and merges all CSV and XLSX files in a directory into a single JSON array.
    Columns with matching names are merged, and missing values are set to `null`.
    Blank values are retained as empty strings.
    """
    dataframes = []
    all_columns = set()

    for index, filename in lsr_files.items():
        file_path = os.path.join(directory_path, filename)
        if os.path.isfile(file_path) and filename.endswith((".csv", ".xls", ".xlsx")):
            print(f"Processing file: {filename}")
            df = read_file(file_path)
            df = translate_and_combine_columns(df, extraction_variables)
            df.insert(0, "LSR #", index)
            all_columns.update(df.columns)
            dataframes.append(df)

    if not dataframes:
        raise ValueError("No CSV or XLSX files found in the directory.")

    merged_df = pd.concat(dataframes, ignore_index=True, sort=False)

    merged_json = merged_df.to_json(orient="records", indent=4)

    with open(output_json_path, "w") as f:
        f.write(merged_json)

    print(f"Merged data saved to {output_json_path}")

    return merged_df
