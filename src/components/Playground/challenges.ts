// Playground dataset + challenge bank.
//
// A self-contained e-commerce store, richer than the Stage 1 seed, so the 50
// challenges can span basics through window functions and recursive CTEs.
// Every `solution` is checked at runtime by SqlRunner: it runs the solution on
// a throwaway copy of this schema and compares the learner's last result set to
// it (order-insensitive unless `ordered`). All solutions are validated against
// sql.js in node before shipping - see scripts in the repo's scratchpad.

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type Challenge = {
  id: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
  /** The task shown to the learner - what query to write. */
  prompt: string;
  /** Canonical SQL whose result the learner's query is checked against. */
  solution: string;
  /** Require identical row order (set for ORDER BY / window / ranking tasks). */
  ordered?: boolean;
  /** Optional nudge, revealed on demand. */
  hint?: string;
};

export const SCHEMA_SQL = `
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT,            -- NULL = not recorded
  signup_date TEXT,
  email       TEXT             -- NULL = none on file
);
INSERT INTO customers VALUES
  (1,  'Ana',  'IE', '2024-02-10', 'ana@ex.com'),
  (2,  'Ben',  'IE', '2024-05-21', 'ben@ex.com'),
  (3,  'Cleo', 'LT', '2023-11-03', NULL),
  (4,  'Dee',  'LT', '2024-08-15', 'dee@ex.com'),
  (5,  'Eve',  'US', '2025-01-09', 'eve@ex.com'),
  (6,  'Finn', 'IE', '2023-07-30', 'finn@ex.com'),
  (7,  'Gus',  'GB', '2024-03-12', NULL),
  (8,  'Hana', 'US', '2025-03-01', 'hana@ex.com'),
  (9,  'Ivan', 'LT', '2024-12-20', 'ivan@ex.com'),
  (10, 'Jo',   'GB', '2025-02-14', 'jo@ex.com'),
  (11, 'Kira', 'US', '2023-09-05', 'kira@ex.com'),
  (12, 'Liam', 'IE', '2025-04-22', NULL);

CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO categories VALUES
  (1, 'Footwear'),
  (2, 'Apparel'),
  (3, 'Accessories'),
  (4, 'Nutrition'),
  (5, 'Equipment');

CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price       REAL,
  stock       INTEGER
);
INSERT INTO products VALUES
  (1,  'Running Shoe',       1, 120.00, 30),
  (2,  'Trail Shoe',         1, 135.00, 12),
  (3,  'Road Shoe',          1, 110.00, 0),
  (4,  'Tech Tee',           2,  35.00, 50),
  (5,  'Wind Jacket',        2,  89.00, 20),
  (6,  'Compression Tights', 2,  65.00, 15),
  (7,  'Trail Socks',        3,  14.00, 200),
  (8,  'Running Cap',        3,  22.00, 40),
  (9,  'Water Bottle',       3,  18.00, 75),
  (10, 'Gel Pack',           4,   2.50, 500),
  (11, 'Energy Bar',         4,   3.00, 400),
  (12, 'Electrolyte Mix',    4,  28.00, 60),
  (13, 'GPS Watch',          5, 250.00, 8),
  (14, 'Foam Roller',        5,  40.00, 25),
  (15, 'Headlamp',           5,  55.00, 18),
  (16, 'Heart Rate Strap',   5,  60.00, 0);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_date  TEXT,
  status      TEXT     -- paid | pending | cancelled | refunded
);
INSERT INTO orders VALUES
  (1,  1,  '2024-03-01', 'paid'),
  (2,  1,  '2024-06-15', 'paid'),
  (3,  2,  '2024-06-20', 'paid'),
  (4,  2,  '2025-01-05', 'pending'),
  (5,  4,  '2024-09-02', 'paid'),
  (6,  6,  '2024-08-10', 'paid'),
  (7,  6,  '2025-02-18', 'refunded'),
  (8,  5,  '2025-02-01', 'paid'),
  (9,  8,  '2025-03-10', 'paid'),
  (10, 9,  '2025-01-25', 'cancelled'),
  (11, 1,  '2025-03-22', 'paid'),
  (12, 11, '2024-10-11', 'paid'),
  (13, 11, '2025-04-01', 'paid'),
  (14, 10, '2025-03-15', 'pending'),
  (15, 7,  '2024-04-18', 'paid'),
  (16, 2,  '2025-04-10', 'paid'),
  (17, 9,  '2025-02-28', 'paid'),
  (18, 5,  '2025-04-05', 'paid'),
  (19, 12, '2025-05-01', 'pending'),
  (20, 6,  '2025-05-12', 'paid');

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity   INTEGER,
  unit_price REAL
);
INSERT INTO order_items VALUES
  (1,  1,  1,  1, 120.00),
  (2,  1,  7,  2,  14.00),
  (3,  2,  4,  2,  35.00),
  (4,  2,  8,  1,  22.00),
  (5,  3,  13, 1, 250.00),
  (6,  3,  9,  1,  18.00),
  (7,  4,  11, 10,  3.00),
  (8,  5,  5,  1,  89.00),
  (9,  5,  6,  1,  65.00),
  (10, 6,  2,  1, 135.00),
  (11, 6,  7,  3,  14.00),
  (12, 7,  14, 1,  40.00),
  (13, 8,  13, 1, 250.00),
  (14, 9,  4,  1,  35.00),
  (15, 9,  8,  2,  22.00),
  (16, 9,  9,  1,  18.00),
  (17, 10, 1,  1, 120.00),
  (18, 11, 10, 20,  2.50),
  (19, 11, 11, 10,  3.00),
  (20, 12, 15, 1,  55.00),
  (21, 12, 12, 2,  28.00),
  (22, 13, 1,  1, 120.00),
  (23, 13, 4,  3,  35.00),
  (24, 14, 9,  2,  18.00),
  (25, 15, 14, 1,  40.00),
  (26, 15, 7,  1,  14.00),
  (27, 16, 5,  1,  89.00),
  (28, 17, 2,  1, 135.00),
  (29, 17, 8,  1,  22.00),
  (30, 18, 6,  2,  65.00),
  (31, 19, 11, 5,   3.00),
  (32, 20, 13, 1, 250.00),
  (33, 20, 9,  1,  18.00);

CREATE TABLE payments (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount   REAL,
  paid_at  TEXT,
  method   TEXT     -- card | paypal | applepay
);
INSERT INTO payments VALUES
  (1,  1,  148.00, '2024-03-01', 'card'),
  (2,  2,   92.00, '2024-06-15', 'paypal'),
  (3,  3,  268.00, '2024-06-20', 'card'),
  (4,  5,  154.00, '2024-09-02', 'card'),
  (5,  6,  177.00, '2024-08-10', 'applepay'),
  (6,  7,   40.00, '2025-02-18', 'card'),
  (7,  8,  250.00, '2025-02-01', 'paypal'),
  (8,  9,   97.00, '2025-03-10', 'card'),
  (9,  11,  80.00, '2025-03-22', 'applepay'),
  (10, 12, 111.00, '2024-10-11', 'card'),
  (11, 13, 225.00, '2025-04-01', 'paypal'),
  (12, 15,  54.00, '2024-04-18', 'card'),
  (13, 16,  89.00, '2025-04-10', 'applepay'),
  (14, 17, 157.00, '2025-02-28', 'card'),
  (15, 18, 130.00, '2025-04-05', 'paypal'),
  (16, 20, 268.00, '2025-05-12', 'card');

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  hire_date  TEXT,
  salary     INTEGER,
  department TEXT
);
INSERT INTO employees VALUES
  (1,  'Maya',  NULL, '2020-01-15', 140000, 'Exec'),
  (2,  'Noah',  1,    '2020-03-01', 110000, 'Engineering'),
  (3,  'Omar',  1,    '2021-06-10', 105000, 'Sales'),
  (4,  'Pia',   2,    '2021-09-20',  92000, 'Engineering'),
  (5,  'Quinn', 2,    '2022-02-14',  88000, 'Engineering'),
  (6,  'Ravi',  3,    '2022-05-30',  80000, 'Sales'),
  (7,  'Sara',  3,    '2023-01-11',  78000, 'Sales'),
  (8,  'Tom',   4,    '2023-08-19',  72000, 'Engineering'),
  (9,  'Uma',   5,    '2024-03-05',  70000, 'Engineering'),
  (10, 'Vik',   6,    '2024-07-22',  60000, 'Sales');
`;

export const CHALLENGES: Challenge[] = [
  // ---- Beginner: SELECT / WHERE / ORDER BY / basics ----
  {
    id: 1,
    title: 'All customers',
    difficulty: 'Beginner',
    topic: 'SELECT',
    prompt: 'Return every column for every customer.',
    solution: 'SELECT * FROM customers;',
    hint: 'SELECT * FROM ...',
  },
  {
    id: 2,
    title: 'Pick columns',
    difficulty: 'Beginner',
    topic: 'SELECT',
    prompt: 'List the name and country of every customer.',
    solution: 'SELECT name, country FROM customers;',
    hint: 'Name the two columns after SELECT.',
  },
  {
    id: 3,
    title: 'Customers from Ireland',
    difficulty: 'Beginner',
    topic: 'WHERE',
    prompt: "Show the names of customers whose country is 'IE'.",
    solution: "SELECT name FROM customers WHERE country = 'IE';",
    hint: 'Filter with WHERE country = ...',
  },
  {
    id: 4,
    title: 'Cheap products',
    difficulty: 'Beginner',
    topic: 'WHERE',
    prompt: 'List the name and price of products priced below 50.',
    solution: 'SELECT name, price FROM products WHERE price < 50;',
    hint: 'Use a < comparison in WHERE.',
  },
  {
    id: 5,
    title: 'Five priciest products',
    difficulty: 'Beginner',
    topic: 'ORDER BY / LIMIT',
    prompt:
      'Show the 5 most expensive products as name and price, most expensive first.',
    solution: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5;',
    ordered: true,
    hint: 'ORDER BY price DESC, then LIMIT 5.',
  },
  {
    id: 6,
    title: 'Distinct countries',
    difficulty: 'Beginner',
    topic: 'DISTINCT',
    prompt:
      'List each distinct country that appears in customers, excluding rows with no country.',
    solution:
      'SELECT DISTINCT country FROM customers WHERE country IS NOT NULL;',
    hint: 'DISTINCT removes duplicates; IS NOT NULL drops the blanks.',
  },
  {
    id: 7,
    title: 'Count the customers',
    difficulty: 'Beginner',
    topic: 'COUNT',
    prompt: 'Return a single number: how many customers are there?',
    solution: 'SELECT COUNT(*) FROM customers;',
    hint: 'COUNT(*) counts rows.',
  },
  {
    id: 8,
    title: 'In stock',
    difficulty: 'Beginner',
    topic: 'WHERE',
    prompt: 'List the names of products that are in stock (stock greater than 0).',
    solution: 'SELECT name FROM products WHERE stock > 0;',
    hint: 'WHERE stock > 0.',
  },
  {
    id: 9,
    title: 'Missing email',
    difficulty: 'Beginner',
    topic: 'NULL',
    prompt: 'List the names of customers who have no email on file.',
    solution: 'SELECT name FROM customers WHERE email IS NULL;',
    hint: 'You cannot use = NULL. Use IS NULL.',
  },
  {
    id: 10,
    title: 'Mid-range prices',
    difficulty: 'Beginner',
    topic: 'BETWEEN',
    prompt: 'List products (name, price) priced between 20 and 60 inclusive.',
    solution: 'SELECT name, price FROM products WHERE price BETWEEN 20 AND 60;',
    hint: 'BETWEEN 20 AND 60 is inclusive of both ends.',
  },

  // ---- Beginner/Intermediate: patterns, dates, CASE, strings ----
  {
    id: 11,
    title: 'Names starting with Running',
    difficulty: 'Beginner',
    topic: 'LIKE',
    prompt: "List product names that start with 'Running'.",
    solution: "SELECT name FROM products WHERE name LIKE 'Running%';",
    hint: "LIKE 'Running%' - % matches any trailing text.",
  },
  {
    id: 12,
    title: 'Two categories',
    difficulty: 'Intermediate',
    topic: 'IN',
    prompt:
      'List the names of products in category 1 (Footwear) or 4 (Nutrition).',
    solution: 'SELECT name FROM products WHERE category_id IN (1, 4);',
    hint: 'WHERE category_id IN (1, 4).',
  },
  {
    id: 13,
    title: 'Orders from 2025',
    difficulty: 'Intermediate',
    topic: 'Dates',
    prompt: 'List the ids of orders placed in the year 2025.',
    solution: "SELECT id FROM orders WHERE strftime('%Y', order_date) = '2025';",
    hint: "strftime('%Y', order_date) extracts the year as text.",
  },
  {
    id: 14,
    title: 'Sorted directory',
    difficulty: 'Intermediate',
    topic: 'ORDER BY',
    prompt:
      'List name and country of customers with a known country, sorted by country (A–Z), then by name (A–Z).',
    solution:
      'SELECT name, country FROM customers WHERE country IS NOT NULL ORDER BY country, name;',
    ordered: true,
    hint: 'ORDER BY country, name applies the second key only within ties.',
  },
  {
    id: 15,
    title: 'Price tiers',
    difficulty: 'Intermediate',
    topic: 'CASE',
    prompt:
      "For every product return its name and a tier: 'cheap' when price is below 30, otherwise 'premium'.",
    solution:
      "SELECT name, CASE WHEN price < 30 THEN 'cheap' ELSE 'premium' END AS tier FROM products;",
    hint: 'CASE WHEN price < 30 THEN ... ELSE ... END.',
  },
  {
    id: 16,
    title: 'Name lengths',
    difficulty: 'Intermediate',
    topic: 'Functions',
    prompt: "Return each customer's name and the number of characters in it.",
    solution: 'SELECT name, length(name) AS len FROM customers;',
    hint: 'length(name) returns the character count.',
  },
  {
    id: 17,
    title: 'Not yet settled',
    difficulty: 'Intermediate',
    topic: 'IN',
    prompt: "List the ids of orders whose status is 'pending' or 'cancelled'.",
    solution:
      "SELECT id FROM orders WHERE status IN ('pending', 'cancelled');",
    hint: "WHERE status IN ('pending', 'cancelled').",
  },
  {
    id: 18,
    title: 'Signup year',
    difficulty: 'Intermediate',
    topic: 'Dates',
    prompt: "Return each customer's name and the year they signed up.",
    solution:
      "SELECT name, strftime('%Y', signup_date) AS yr FROM customers;",
    hint: "strftime('%Y', signup_date).",
  },

  // ---- Aggregation / GROUP BY / HAVING ----
  {
    id: 19,
    title: 'Customers per country',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt:
      'Count customers per country. Treat the missing country as its own group. Return country and the count.',
    solution: 'SELECT country, COUNT(*) FROM customers GROUP BY country;',
    hint: 'GROUP BY country, then COUNT(*).',
  },
  {
    id: 20,
    title: 'Average price by category',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt: 'For each category_id, return the average product price.',
    solution: 'SELECT category_id, AVG(price) FROM products GROUP BY category_id;',
    hint: 'AVG(price) with GROUP BY category_id.',
  },
  {
    id: 21,
    title: 'Total units in stock',
    difficulty: 'Beginner',
    topic: 'SUM',
    prompt: 'Return a single number: the total stock across all products.',
    solution: 'SELECT SUM(stock) FROM products;',
    hint: 'SUM(stock).',
  },
  {
    id: 22,
    title: 'Top price per category',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt: 'For each category_id, return the highest product price.',
    solution: 'SELECT category_id, MAX(price) FROM products GROUP BY category_id;',
    hint: 'MAX(price) with GROUP BY category_id.',
  },
  {
    id: 23,
    title: 'Crowded categories',
    difficulty: 'Intermediate',
    topic: 'HAVING',
    prompt: 'List the category_id values that contain more than 3 products.',
    solution:
      'SELECT category_id FROM products GROUP BY category_id HAVING COUNT(*) > 3;',
    hint: 'Filter groups with HAVING COUNT(*) > 3.',
  },
  {
    id: 24,
    title: 'Order line totals',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt:
      'For each order_id, return the total value of its items (sum of quantity × unit_price).',
    solution:
      'SELECT order_id, SUM(quantity * unit_price) FROM order_items GROUP BY order_id;',
    hint: 'SUM(quantity * unit_price), grouped by order_id.',
  },
  {
    id: 25,
    title: 'Orders per customer',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt:
      'Count how many orders each customer_id has in the orders table. Return customer_id and the count.',
    solution: 'SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;',
    hint: 'GROUP BY customer_id, COUNT(*).',
  },
  {
    id: 26,
    title: 'Total payments',
    difficulty: 'Beginner',
    topic: 'SUM',
    prompt: 'Return a single number: the sum of all payment amounts.',
    solution: 'SELECT SUM(amount) FROM payments;',
    hint: 'SUM(amount) on payments.',
  },
  {
    id: 27,
    title: 'Units sold per product',
    difficulty: 'Intermediate',
    topic: 'GROUP BY',
    prompt:
      'For each product_id, return the total quantity sold across all order_items.',
    solution:
      'SELECT product_id, SUM(quantity) FROM order_items GROUP BY product_id;',
    hint: 'SUM(quantity) grouped by product_id.',
  },
  {
    id: 28,
    title: 'Big orders',
    difficulty: 'Advanced',
    topic: 'HAVING',
    prompt:
      'List the order_id of every order whose item total (sum of quantity × unit_price) exceeds 200.',
    solution:
      'SELECT order_id FROM order_items GROUP BY order_id HAVING SUM(quantity * unit_price) > 200;',
    hint: 'Aggregate per order, then filter with HAVING.',
  },

  // ---- Joins ----
  {
    id: 29,
    title: 'Orders with names',
    difficulty: 'Intermediate',
    topic: 'JOIN',
    prompt: "Return each order's id together with the customer's name.",
    solution:
      'SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;',
    hint: 'JOIN customers ON c.id = o.customer_id.',
  },
  {
    id: 30,
    title: 'What is in order 1?',
    difficulty: 'Intermediate',
    topic: 'JOIN',
    prompt: 'List the product names contained in order 1.',
    solution:
      'SELECT p.name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = 1;',
    hint: 'Join order_items to products, filter order_id = 1.',
  },
  {
    id: 31,
    title: 'Paid order totals by customer',
    difficulty: 'Advanced',
    topic: 'JOIN + GROUP BY',
    prompt:
      "For each PAID order, return the customer's name and that order's item total (sum of quantity × unit_price).",
    solution:
      "SELECT c.name, SUM(oi.quantity * oi.unit_price) FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'paid' GROUP BY o.id, c.name;",
    hint: 'Join three tables, filter status, then group by the order.',
  },
  {
    id: 32,
    title: 'Never ordered',
    difficulty: 'Advanced',
    topic: 'LEFT JOIN',
    prompt: 'List the names of customers who have never placed an order.',
    solution:
      'SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;',
    hint: 'LEFT JOIN then keep rows where the order side is NULL.',
  },
  {
    id: 33,
    title: 'Product categories',
    difficulty: 'Intermediate',
    topic: 'JOIN',
    prompt: 'Return each product name alongside its category name.',
    solution:
      'SELECT p.name, c.name FROM products p JOIN categories c ON c.id = p.category_id;',
    hint: 'Join products to categories on category_id.',
  },
  {
    id: 34,
    title: 'Who reports to whom',
    difficulty: 'Advanced',
    topic: 'Self join',
    prompt:
      "Return each employee's name and their manager's name. Skip employees who have no manager.",
    solution:
      'SELECT e.name, m.name AS manager FROM employees e JOIN employees m ON m.id = e.manager_id;',
    hint: 'Join employees to itself: e.manager_id = m.id.',
  },
  {
    id: 35,
    title: "Ana's products",
    difficulty: 'Advanced',
    topic: 'Multi-join',
    prompt: "List the distinct product names that customer 'Ana' has ordered.",
    solution:
      "SELECT DISTINCT p.name FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE c.name = 'Ana';",
    hint: 'Chain customers → orders → order_items → products, then DISTINCT.',
  },
  {
    id: 36,
    title: 'Payments with buyer',
    difficulty: 'Advanced',
    topic: 'Multi-join',
    prompt: "For each payment, return the customer's name, the amount, and the method.",
    solution:
      'SELECT c.name, p.amount, p.method FROM payments p JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = o.customer_id;',
    hint: 'payments → orders → customers.',
  },
  {
    id: 37,
    title: 'Order count, zeros included',
    difficulty: 'Advanced',
    topic: 'LEFT JOIN',
    prompt:
      'For every customer return their name and number of orders, showing 0 for customers with none.',
    solution:
      'SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name;',
    hint: 'LEFT JOIN keeps every customer; COUNT(o.id) ignores the NULLs.',
  },

  // ---- Subqueries ----
  {
    id: 38,
    title: 'Above average',
    difficulty: 'Advanced',
    topic: 'Scalar subquery',
    prompt:
      'List the name and price of products priced above the average product price.',
    solution:
      'SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);',
    hint: 'Compare price to a scalar subquery that returns the average.',
  },
  {
    id: 39,
    title: 'Customers who paid',
    difficulty: 'Advanced',
    topic: 'Subquery / IN',
    prompt: 'List the names of customers who have at least one payment.',
    solution:
      'SELECT name FROM customers WHERE id IN (SELECT o.customer_id FROM orders o JOIN payments p ON p.order_id = o.id);',
    hint: 'Build the set of customer_ids that have a payment, then IN.',
  },
  {
    id: 40,
    title: 'Unpaid orders',
    difficulty: 'Advanced',
    topic: 'NOT EXISTS',
    prompt: 'List the ids of orders that have no matching payment.',
    solution:
      'SELECT id FROM orders WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = orders.id);',
    hint: 'NOT EXISTS with a correlated subquery on order_id.',
  },
  {
    id: 41,
    title: 'The flagship',
    difficulty: 'Intermediate',
    topic: 'Scalar subquery',
    prompt: 'Return the name of the single most expensive product.',
    solution:
      'SELECT name FROM products WHERE price = (SELECT MAX(price) FROM products);',
    hint: 'WHERE price = (SELECT MAX(price) ...).',
  },
  {
    id: 42,
    title: 'Repeat buyers',
    difficulty: 'Intermediate',
    topic: 'HAVING',
    prompt: 'List the customer_id of every customer with more than 2 orders.',
    solution:
      'SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 2;',
    hint: 'Group orders by customer, keep groups with COUNT(*) > 2.',
  },
  {
    id: 43,
    title: 'Average order size',
    difficulty: 'Advanced',
    topic: 'Derived table',
    prompt:
      'Return a single number: the average order total. First total each order, then average those totals.',
    solution:
      'SELECT AVG(t) FROM (SELECT SUM(quantity * unit_price) AS t FROM order_items GROUP BY order_id);',
    hint: 'Aggregate twice: inner query totals each order, outer query averages.',
  },

  // ---- Window functions / CTEs / recursion ----
  {
    id: 44,
    title: 'Rank within category',
    difficulty: 'Advanced',
    topic: 'Window',
    prompt:
      'For each product show name, category_id, and its price rank within its category (1 = most expensive). Order the output by category_id, then rank.',
    solution:
      'SELECT name, category_id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rnk FROM products ORDER BY category_id, rnk;',
    ordered: true,
    hint: 'ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC).',
  },
  {
    id: 45,
    title: 'Running payment total',
    difficulty: 'Advanced',
    topic: 'Window',
    prompt:
      'Order payments by paid_at (then order_id to break ties). Return order_id, amount, and a running total of amount up to and including that row.',
    solution:
      'SELECT order_id, amount, SUM(amount) OVER (ORDER BY paid_at, order_id) AS running FROM payments ORDER BY paid_at, order_id;',
    ordered: true,
    hint: 'SUM(amount) OVER (ORDER BY paid_at, order_id).',
  },
  {
    id: 46,
    title: 'Salary rank by department',
    difficulty: 'Advanced',
    topic: 'Window',
    prompt:
      'Rank employees by salary within their department (1 = highest paid). Return name, department, salary, and the rank. Order by department, then rank.',
    solution:
      'SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees ORDER BY department, rnk;',
    ordered: true,
    hint: 'RANK() OVER (PARTITION BY department ORDER BY salary DESC).',
  },
  {
    id: 47,
    title: 'Compared to previous hire',
    difficulty: 'Advanced',
    topic: 'Window / LAG',
    prompt:
      'Order employees by hire_date. For each, return name, salary, and the salary of the employee hired just before them (NULL for the earliest).',
    solution:
      'SELECT name, salary, LAG(salary) OVER (ORDER BY hire_date) AS prev_salary FROM employees ORDER BY hire_date;',
    ordered: true,
    hint: 'LAG(salary) OVER (ORDER BY hire_date).',
  },
  {
    id: 48,
    title: 'Best-selling category',
    difficulty: 'Advanced',
    topic: 'CTE',
    prompt:
      'Using a CTE, find the category with the highest total sales revenue (sum of quantity × unit_price across its products). Return the category name and its revenue.',
    solution:
      'WITH cat_rev AS (SELECT c.name AS cat, SUM(oi.quantity * oi.unit_price) AS rev FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id GROUP BY c.id, c.name) SELECT cat, rev FROM cat_rev ORDER BY rev DESC LIMIT 1;',
    hint: 'CTE totals revenue per category; outer query takes the top one.',
  },
  {
    id: 49,
    title: 'Org chart depth',
    difficulty: 'Advanced',
    topic: 'Recursive CTE',
    prompt:
      'Using a recursive CTE, return each employee\'s name and their level in the hierarchy (Maya, who has no manager, is level 1). Order by level, then name.',
    solution:
      'WITH RECURSIVE chain AS (SELECT id, name, 1 AS lvl FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.id, e.name, c.lvl + 1 FROM employees e JOIN chain c ON e.manager_id = c.id) SELECT name, lvl FROM chain ORDER BY lvl, name;',
    ordered: true,
    hint: 'Anchor = the manager-less row at level 1; recursive step adds 1 per level.',
  },
  {
    id: 50,
    title: 'Top spender',
    difficulty: 'Advanced',
    topic: 'CTE + JOIN',
    prompt:
      'Return the name and total spent of the customer who has spent the most across their PAID orders (sum of quantity × unit_price).',
    solution:
      "WITH spend AS (SELECT c.id, c.name, SUM(oi.quantity * oi.unit_price) AS total FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'paid' GROUP BY c.id, c.name) SELECT name, total FROM spend ORDER BY total DESC LIMIT 1;",
    hint: 'Total each customer\'s paid spend in a CTE, then take the top row.',
  },

  // ---- Set operations: UNION / UNION ALL / INTERSECT / EXCEPT ----
  {
    id: 51,
    title: 'Combine two countries',
    difficulty: 'Beginner',
    topic: 'UNION',
    prompt:
      "Write one query that lists the customer country 'IE', and a second query for 'US', and combine them with UNION so each country appears once. Return the country column.",
    solution:
      "SELECT country FROM customers WHERE country = 'IE' UNION SELECT country FROM customers WHERE country = 'US';",
    hint: 'UNION stacks two SELECTs and removes duplicate rows.',
  },
  {
    id: 52,
    title: 'Footwear and accessories list',
    difficulty: 'Beginner',
    topic: 'UNION ALL',
    prompt:
      'Return the names of all Footwear (category 1) products, then all Accessories (category 3) products, keeping every row (do not deduplicate). Use UNION ALL.',
    solution:
      'SELECT name FROM products WHERE category_id = 1 UNION ALL SELECT name FROM products WHERE category_id = 3;',
    hint: 'UNION ALL keeps duplicates and is cheaper than UNION.',
  },
  {
    id: 53,
    title: 'Both paid and pending',
    difficulty: 'Intermediate',
    topic: 'INTERSECT',
    prompt:
      'Return the customer_id of every customer who has at least one paid order AND at least one pending order. Use INTERSECT.',
    solution:
      "SELECT customer_id FROM orders WHERE status = 'paid' INTERSECT SELECT customer_id FROM orders WHERE status = 'pending';",
    hint: 'INTERSECT keeps only rows present in both result sets.',
  },
  {
    id: 54,
    title: 'Orders with no payment',
    difficulty: 'Intermediate',
    topic: 'EXCEPT',
    prompt:
      'Return the id of every order that does NOT appear in the payments table. Take all order ids and subtract the order_ids that have a payment, using EXCEPT.',
    solution: 'SELECT id FROM orders EXCEPT SELECT order_id FROM payments;',
    hint: 'EXCEPT returns rows in the first query that are absent from the second.',
  },

  // ---- More window functions: DENSE_RANK / NTILE / LEAD / explicit frame ----
  {
    id: 55,
    title: 'Dense salary ranking',
    difficulty: 'Advanced',
    topic: 'Window / DENSE_RANK',
    prompt:
      'Rank employees by salary within their department (1 = highest paid) using DENSE_RANK so ties share a rank with no gaps after. Return name, department, salary, and the rank. Order by department, then rank, then name.',
    solution:
      'SELECT name, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees ORDER BY department, rnk, name;',
    ordered: true,
    hint: 'DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC).',
  },
  {
    id: 56,
    title: 'Price quartiles',
    difficulty: 'Advanced',
    topic: 'Window / NTILE',
    prompt:
      'Split products into 4 equal price buckets from most to least expensive using NTILE(4). Return name, price, and the quartile (1 = priciest bucket). Order by price descending, then name.',
    solution:
      'SELECT name, price, NTILE(4) OVER (ORDER BY price DESC) AS quartile FROM products ORDER BY price DESC, name;',
    ordered: true,
    hint: 'NTILE(4) OVER (ORDER BY price DESC) divides the rows into 4 groups.',
  },
  {
    id: 57,
    title: 'Next hire’s salary',
    difficulty: 'Advanced',
    topic: 'Window / LEAD',
    prompt:
      'Order employees by hire_date. For each, return name, hire_date, salary, and the salary of the employee hired just AFTER them (NULL for the most recent hire). Use LEAD.',
    solution:
      'SELECT name, hire_date, salary, LEAD(salary) OVER (ORDER BY hire_date) AS next_salary FROM employees ORDER BY hire_date;',
    ordered: true,
    hint: 'LEAD(salary) OVER (ORDER BY hire_date) looks one row forward.',
  },
  {
    id: 58,
    title: 'Moving average of payments',
    difficulty: 'Advanced',
    topic: 'Window / frame',
    prompt:
      'Order payments by paid_at (then order_id to break ties). For each row return order_id, amount, and the average amount over the current row and the two before it, using an explicit frame ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.',
    solution:
      'SELECT order_id, amount, AVG(amount) OVER (ORDER BY paid_at, order_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg FROM payments ORDER BY paid_at, order_id;',
    ordered: true,
    hint: 'Add a frame clause: AVG(amount) OVER (ORDER BY ... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).',
  },

  // ---- DML: write-then-SELECT (press Reset data to retry) ----
  {
    id: 59,
    title: 'Add a category',
    difficulty: 'Intermediate',
    topic: 'INSERT',
    prompt:
      "Insert a new category with id 6 and name 'Recovery', then SELECT its id and name to show the result. (Press Reset data to retry from a clean state.)",
    solution:
      "INSERT INTO categories (id, name) VALUES (6, 'Recovery'); SELECT id, name FROM categories WHERE name = 'Recovery';",
    hint: 'INSERT INTO categories (id, name) VALUES (...); then SELECT the new row back.',
  },
  {
    id: 60,
    title: 'Raise nutrition prices',
    difficulty: 'Intermediate',
    topic: 'UPDATE',
    prompt:
      'Increase the price of every Nutrition product (category_id 4) by 10% (multiply by 1.10), then SELECT each Nutrition product’s name and new price ordered by name to show the result. (Press Reset data to retry.)',
    solution:
      'UPDATE products SET price = price * 1.10 WHERE category_id = 4; SELECT name, price FROM products WHERE category_id = 4 ORDER BY name;',
    ordered: true,
    hint: 'UPDATE products SET price = price * 1.10 WHERE category_id = 4; then SELECT them back.',
  },
  {
    id: 61,
    title: 'Purge cancelled orders',
    difficulty: 'Intermediate',
    topic: 'DELETE',
    prompt:
      "Delete every order whose status is 'cancelled', then SELECT each remaining status with its order count (status, count) ordered by status to show the result. (Press Reset data to retry.)",
    solution:
      "DELETE FROM orders WHERE status = 'cancelled'; SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY status;",
    ordered: true,
    hint: "DELETE FROM orders WHERE status = 'cancelled'; then GROUP BY status to show what survives.",
  },
];
