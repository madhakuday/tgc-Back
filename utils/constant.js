const onlyAdminStatus = ['verified', 'approve', 'reject', 'return', 'replace', 'billable', 'paid']

const questionIdMap = {
    '67211e35066e168369880d79': 'first_name',
    '67211e35066e168369880d7a': 'last_name',
    '67211e35066e168369880d7b': 'email',
    '67211e35066e168369880d7c': 'number'
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