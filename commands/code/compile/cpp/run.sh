#!/bin/bash
g++ ./commands/code/compile/cpp/code.cpp -o ./commands/code/compile/cpp/script
./commands/code/compile/cpp/script < ./commands/code/compile/cpp/in.txt > ./commands/code/compile/out.txt