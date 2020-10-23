*** Variables ***
${email base}              cloudsmokecheck@gmail.com
@{local auth}              admin    ${password}
@{cloud auth}              ${email base}    ${password}
${password}                qweasd 123
${new password}            QWEasd!@#
${restored password}       qweasd777$
${email password}          QWEasd!@#

${ssh host ip}        10.1.5.133
@{ssh auth}           test_runner    qweasd 123
${system users port}  7711
${system vms port}    7712
${merge 1 port}       7713
${merge 2 port}       7714

${ENV}    https://cloud-test.hdw.mx
${VMS}    4.1
