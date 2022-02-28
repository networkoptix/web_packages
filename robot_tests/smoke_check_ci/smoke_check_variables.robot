*** Variables ***
#${email base}              cloudsmokecheck@gmail.com
#${email acc}               cloudsmokecheck+acc@gmail.com
#${email auth}              cloudsmokecheck+auth@gmail.com
#${email vms}               cloudsmokecheck+vms@gmail.com
#${email pages}             cloudsmokecheck+pages@gmail.com
#${email users}             cloudsmokecheck+users@gmail.com
#${email existing user1}    cloudsmokecheck+registered1@gmail.com
#${email existing user2}    cloudsmokecheck+registered2@gmail.com
#${email relay}             cloudsmokecheck+relay@gmail.com
#${email customizations}    cloudsmokecheck+customizations@gmail.com

@{local auth}              admin    ${password}
@{cloud auth}              ${email base}    ${password}
${password}                qweasd 123
${new password}            QWEasd!@#
${restored password}       qweasd777$
${email password}          QWEasd!@#

${ssh host ip}        10.1.5.238
@{ssh auth}           qaburbank    QABurbank777$
${system users port}  7711
${system vms port}    7712
${merge 1 port}       7713
${merge 2 port}       7714

${ENV}    https://cloud-test.hdw.mx
${VMS URL}    https://beta.networkoptix.com/beta-builds/default/4.2.0.34321/linux/nxwitness-server-4.2.0.34321-linux64-private_patch.deb
${IMG}    mediaserver
