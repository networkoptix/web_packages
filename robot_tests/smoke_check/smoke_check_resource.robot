*** Settings ***
Resource     ../resource.robot
Resource     ../APIresource.robot
Resource     ../variables.robot
Resource     smoke_check_variables.robot
Variables    get_variables.py    ${ENV}    ${VMS}
