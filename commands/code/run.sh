#!/bin/bash

g++ ./commands/code/code.cpp -o ./commands/code/script
./commands/code/script < ./commands/code/in.txt > ./commands/code/out.txt