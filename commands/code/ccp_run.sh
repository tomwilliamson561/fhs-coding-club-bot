#!/bin/bash

g++ ./commands/code/cpp_code.cpp -o ./commands/code/cpp_script
./commands/code/cpp_script < ./commands/code/cpp_in.txt > ./commands/code/cpp_out.txt