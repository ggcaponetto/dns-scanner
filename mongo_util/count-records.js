db = db.getSiblingDB("dns-scanner");
db.getCollection("records").aggregate(
    [
        {
            $match: {
                ip: {
                    $regex: '27[.]0[.]\\d+[.]\\d+'
                }
            }
        },
        {
            $count: "total_docs_in_ip_range"
        }
    ])
    ;
