-- Orders settled before split payments existed carry paid = true but no amount.
-- Without this the new bill maths would read them as still owing.
UPDATE "orders" SET "paidMinor" = "totalMinor" WHERE "paid" = true AND "paidMinor" = 0;
