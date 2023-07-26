#!/bin/bash

g++ ./commands/code/compile/cpp_code.cpp -o ./commands/code/compile/cpp_script
./commands/code/compile/cpp_script < ./commands/code/compile/cpp_in.txt > ./commands/code/compile/cpp_out.txt