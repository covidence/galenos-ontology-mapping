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
    for original_col, translation in translation_dict.items():
        new_col = translation

        if original_col in df.columns:
            # If the target column (new_col) already exists, combine the data
            if new_col in df.columns:
                raise ValueError(
                    f"Column name conflict: both {original_col} and {new_col} are present."
                )
            else:
                # Rename the column to the new label
                df[new_col] = df[original_col]
            # Drop the original column after translation
            df.drop(columns=[original_col], inplace=True)

    return df


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
