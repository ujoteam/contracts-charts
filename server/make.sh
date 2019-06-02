#!/bin/bash

npm run build-js &&
cp ../build/contracts/Chart.json ./static/ &&
zip -x *.git* -x "node_modules/**" -x ".env" -r "../build/charts-backend.zip" .

echo Build complete.
