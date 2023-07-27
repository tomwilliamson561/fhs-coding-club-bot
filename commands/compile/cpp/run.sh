#!/bin/bash
g++ ./commands/compile/cpp/code.cpp -o ./commands/compile/cpp/script
./commands/compile/cpp/script < ./commands/compile/cpp/in.txt > ./commands/compile/out.txt