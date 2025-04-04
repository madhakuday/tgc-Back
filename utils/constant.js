const onlyAdminStatus = ['verified', 'approve', 'reject', 'return', 'replace', 'billable', 'paid']

const questionIdMap = {
    '67211e35066e168369880d79': 'first_name',
    '67211e35066e168369880d7a': 'last_name',
    '67211e35066e168369880d7b': 'email',
    '67211e35066e168369880d7c': 'number',
    '673bcc34f5891ed2fe4a1902': "abuse_type",
    '6729a5db127c4b270ff85bd7': "dob",
    '6729a559127c4b270ff85bc5': "address",
    '67211e35066e168369880d7e': "ip_address",
    '673299bd7309a506a7db0fbd': "lp_url",
    '6729a906127c4b270ff85cc4': "represented_by_attorney",
    '6733f279d1d333e7171e2c79': "summary",
    '6729b595127c4b270ff8648d': "year_of_diagnosed",
    '6729aeab127c4b270ff86112': "injury",
    '6733f2cfd1d333e7171e2c9c': "straightener_used",
    '67211e35066e168369880d82': "trusted_form_certificate",
    '67211e35066e168369880d7d': "zip_code",
    '673be5f3f5891ed2fe4a1b31': "product_name",
    '673299e17309a506a7db0fd9': "use_product",
    '673be64df5891ed2fe4a1b56': "diagnosed",
    '6729bb2f127c4b270ff86ac0': "city",
    '67be650f83ef5f059838a1b3': "what_product_did_you_use",
    '67be653a83ef5f059838a1ba': "did_you_use_for_more_than_one_year",
    '67be66bb83ef5f059838a37b': "were_you_diagnosed_with_meningioma",
    '6729a821127c4b270ff85c77': "date_of_diagnosed",
    '673299a07309a506a7db0fb6': "use_state",
    '67eaa020d771199786aa0777': "street"
}

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

module.exports = {
    onlyAdminStatus,
    questionIdMap,
    monthNames
    
}