import { createClient } from 'redis';

const redisClient = createClient({
    username: 'default',
    password: 'WkWMa6Ll91muwHzPI3WYf04AMYtqsjLe',
    socket: {
        host: 'redis-12210.crce206.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 12210
    }
});

client.on('error', err => console.log('Redis Client Error', err));




module.exports = redisClient;