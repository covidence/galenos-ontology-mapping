#!/bin/bash
pip install -r requirements.txt
watchmedo shell-command --patterns="ontology_mapping.csv" --command="python process_mapping.py" &
cd frontend
npm install
npm start
