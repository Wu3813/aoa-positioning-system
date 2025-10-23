#!/bin/bash

# 执行sql文件
docker exec -i 4aoa-mvp-mariadb-1 mariadb -uroot -p123456 < 05_tag.sql