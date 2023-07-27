#!/bin/bash
sudo g++ ./commands/compile/cpp/code.cpp -o ./commands/compile/cpp/script
sudo ./commands/compile/cpp/script < ./commands/compile/cpp/in.txt > ./commands/compile/out.txt