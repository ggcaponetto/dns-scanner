db = db.getSiblingDB("dns-scanner");
db.getCollection("records").aggregate(
    [
        {
            $match: {
                ip: {
                    $regex: /.*/
                }
            }
        },
        {
            $count: "total_docs_in_ip_range"
        }
    ])
    ;
