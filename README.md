# GALENOS Ontology Mapping

## Process mapping CSV

ontology_mapping.csv is a modified version of the [Mental Health Ontology mapping to LSRs.csv](https://github.com/galenos-project/mental-health-ontology/blob/main/Mapping%20to%20LSRs/Mental%20Health%20Ontology%20mapping%20to%20LSRs.csv). Eventually this will be pulled directly from GitHub. `process_mapping.py` converts the hierarchy to JSON and saves it to the frontend folder so it can be more easily rendered in the client. It also merges the example extracted data files into a single json file.

### Install dependencies
```
pip install -r requirements.txt
```

### Run the script
```
python process_mapping.py
```

## Frontend

The frontend app renders a hierarchy of ontology terms on the left to select which data extraction columns to display on the right.

### Navigate to frontend folder
```
cd frontend
```

### Install dependencies
```
npm install
```

### Run the development server
```
npm start
```
