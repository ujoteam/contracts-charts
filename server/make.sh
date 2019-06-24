#!/bin/bash

function build_frontend {
    echo Building frontend...
    cp ../build/contracts/Chart.json ./frontend/src/ &&
    pushd frontend && yarn build && popd &&
    rm -rf ./static &&
    cp -R ./frontend/build ./static
}

function build_backend {
    echo Building backend...
    cp ../build/contracts/Chart.json ./static/ &&
    zip -x *.git* -x "node_modules/**" -x "frontend/**" -x ".env" -r "../build/charts-backend.zip" . &&

    echo Build complete.  Bundle saved to ../build/charts-backend.zip
}

build_frontend && build_backend
