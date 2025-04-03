CREATE TABLE map (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    image_path VARCHAR(255),
    x_min DOUBLE NOT NULL,
    x_max DOUBLE NOT NULL,
    y_min DOUBLE NOT NULL,
    y_max DOUBLE NOT NULL,
    create_time DATETIME NOT NULL
);

CREATE TABLE current_map (
    map_id BIGINT PRIMARY KEY,
    FOREIGN KEY (map_id) REFERENCES map(id)
);