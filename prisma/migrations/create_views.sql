-- Create database views

-- Reserve Status View
CREATE OR REPLACE VIEW reserve_status AS
SELECT 
    r.currency,
    r.target_weight,
    r.actual_weight,
    r.reserve_amount,
    r.reserve_value_usd,
    (r.actual_weight - r.target_weight) as weight_drift,
    r.timestamp
FROM reserves r
WHERE r.timestamp = (
    SELECT MAX(timestamp) 
    FROM reserves 
    WHERE currency = r.currency
);

-- Transaction Summary View
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    DATE(created_at) as date,
    type,
    status,
    COUNT(*) as count,
    SUM(acbu_amount) as total_acbu,
    SUM(fee) as total_fees
FROM transactions
GROUP BY DATE(created_at), type, status;
