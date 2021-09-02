#!/bin/bash
# Pull the version from the package.json
version=$(cat ./package.json | grep version | awk -F '"' '{ print $4}')
name=epicreminderv2
tag=smugdev/$name

# Check if running
running=$(docker ps -a | grep "$name" | awk {'print $1'})

echo $running

if [[ ! -z "$running" ]]
then
        echo "Running Instance Found.. Stopping"
        docker stop $running
        echo "Deleting Image"
        docker rm $running

fi

# Build the image
docker build -t $tag:$version .

# Run the image
docker run -td --restart unless-stopped --name $name $tag:$version
docker logs $name --follow
