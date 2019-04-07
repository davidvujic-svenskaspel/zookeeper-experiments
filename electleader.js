const { createClient, ZooKeeper } = require('./wrapper.js');
const notifier = require('./notifier.js');

function onData(client, path, rc, error, stat, data) {
  const clientId = client.client_id;

  if (data && data.toString() === clientId) {
    notifier.emit('leader', `(${path}) ${clientId}`);
  }
}

function watcher(client, path, checkFunc, retryFunc, rc) {
  if (rc === -1) {
    checkFunc(client, path, retryFunc);
  } else if (rc === 2) {
    retryFunc(client, path);
  }
}

function checkMaster(client, path, retryFunc) {
  const watchFunc = watcher.bind(null, client, path, checkMaster, retryFunc);

  client.aw_get(path, watchFunc, onData.bind(null, client, path));
}

function runForLeader(client, path) {
  const clientId = client.client_id;

  client.a_create(path, `${clientId}`, ZooKeeper.ZOO_EPHEMERAL, (rc) => {
    if (rc !== 0) {
      checkMaster(client, path, runForLeader);
      return;
    }

    notifier.emit('leader', `(${path}) ${clientId}`);
  });
}

function electLeader(path) {
  const client = createClient();

  client.on('connect', () => {
    notifier.emit('connect', `session established, id=${client.client_id}`);
    runForLeader(client, path);
  });

  client.connect(() => {
  });
}

module.exports = {
  electLeader,
};
