#!/bin/bash

# 导出tag表数据
docker exec -t 4aoa-mvp-mariadb-1 mariadb-dump -uroot -p123456 aoa tag > 05_tag.sql
