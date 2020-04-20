*** Variables ***
${email base}              cloudsmokecheck@gmail.com
${email auth}              cloudsmokecheck+auth@gmail.com
${email acc}               cloudsmokecheck+acc@gmail.com
${email vms}               cloudsmokecheck+vms@gmail.com
${email users}             cloudsmokecheck+users@gmail.com
${email existing user1}    cloudsmokecheck+registered1@gmail.com
${email existing user2}    cloudsmokecheck+registered2@gmail.com
${password}                ${BASE PASSWORD}
${new password}            QWEasd!@#
${restored password}       qweasd777$

${email password}    QWEasd!@#
@{local auth}        admin    ${password}

${server vms}      http://10.1.5.148
${server users}    http://10.1.5.192
${server port}     7001

${system vms}      vpc3-ub18
${system users}    vpc4-ub18


