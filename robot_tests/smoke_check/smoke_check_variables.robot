*** Variables ***
${email base}              cloudsmokecheck@gmail.com
${email acc}               cloudsmokecheck+acc@gmail.com
${email auth}              cloudsmokecheck+auth@gmail.com
${email vms}               cloudsmokecheck+vms@gmail.com
${email users}             cloudsmokecheck+users@gmail.com
${email existing user1}    cloudsmokecheck+registered1@gmail.com
${email existing user2}    cloudsmokecheck+registered2@gmail.com
${email relay}             cloudsmokecheck+relay@gmail.com
${email customizations}    cloudsmokecheck+customizations@gmail.com

@{local auth}              admin    ${password}
@{cloud auth}              ${email base}    ${password}
${password}                qweasd 123
${new password}            QWEasd!@#
${restored password}       qweasd777$
${email password}          QWEasd!@#

${ssh host ip}        10.1.5.238
@{ssh auth}           test_runner    qweasd 123
${system users port}  7711
${system vms port}    7712
${merge 1 port}       7713
${merge 2 port}       7714

${ENV}    https://test2.cloud.hdw.mx
${VMS}    4.1

${system la port}     7801
${system ny port}     7802
${system fr port}     7803
${system sy port}     7804
${system si port}     7805
${system ch port}     7806
${system chi port}    7807

&{relays}
...    la=relay-la.vmsproxy.com
...    ny=relay-ny.vmsproxy.com
...    fr=relay-fr.vmsproxy.com
...    sy=relay-sy.vmsproxy.com
...    si=relay-si.vmsproxy.com
...    ch=relay-ch.vmsproxy.com
...    chi=relay-chi.vmsproxy.com

&{customizations}
...    nx=https://nxvms.com
...    dw=https://dwspectrum.digital-watchdog.com
...    wave=https://sync.wavevms.com
...    awl=https://awlcloud.awl.co.jp
...    blackbox=https://live.black-box.com.au
...    coresmp=https://connect.coresmp.com
...    hankset=https://cloud.hankest.com
...    ionetworks=https://portal.ioezcloud.com
...    ipera=https://cloud.flyviewvms.ru
...    piko=https://cloud.pikovms.com
...    ras=https://pbxcloud.rassecurity.com
...    senturian=https://senturian.nxvms.cloud
...    systemk=https://skcloud.systemk.co.jp
...    telstra=https://tvs.telstra.com
...    viveex=https://viveexlink.daekyo.com
...    xcello=https://xccelo.nxvms.cloud
