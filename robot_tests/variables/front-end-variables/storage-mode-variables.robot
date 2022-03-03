*** Variables ***
${QA BURBANK IP}     10.1.5.239
${password}    ${BASE PASSWORD}
${url}         ${ENV}
${storage string 1}    --mount type=bind,source="/home/qaburbank/disk-invalid",target=/invalid
${storage string 2}    ${EMPTY}
${camera}      D8-D4-3C-60-F0-D3
${camera url}    http://192.168.0.27/
${camera manufacturer}    Sony
${camera user}    admin
${camera password}    QAbur777$
${camera resourceId}    {a836b98b-65e2-2304-57e9-a09fc55a50a4}
${disk location}    /media/nxwitness-storages/disk1
${backup initialized}    ${FALSE}
${change focus}    //h4[contains(text(),"Storage")]
@{disk size}    80000    30000    30000    12000    12000
${networkdisk}    //${QA BURBANK IP}/networkdisk
${drives}    5