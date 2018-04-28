mkdir -p /tmp/deploy

openssl aes-256-cbc -K $encrypted_155403539006_key -iv $encrypted_155403539006_iv -in .travis/github-deploy-key.enc -out /tmp/deploy/github-deploy-key -d

chmod 600 /tmp/deploy/github-deploy-key

eval $(ssh-agent -s)

ssh-add /tmp/deploy/github-deploy-key
