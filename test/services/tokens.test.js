let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let config = require('../../src/config');
let services = require('../../src/services');
let tokenService = services.token;
let db = require('../../src/db')();

describe('Token tests', function () {
  describe('Save, Find and Get Token tests', function () {
    let newToken, tokenFromDb, newTokenWithScopes, tokenFromDbWithScopes;
    before(function (done) {
      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save a token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDb = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find a token', function (done) {
      tokenService.find(newToken)
      .then((token) => {
        token.should.eql(tokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt'];
      let [ id, _tokenDecrypted ] = tokenFromDb.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.consumerId.should.eql(newToken.consumerId);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not create a new token if one exists and is not expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.should.eql(tokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save a token with scopes', function (done) {
      newTokenWithScopes = {
        consumerId: '1234',
        authType: 'oauth',
        scopes: ['scope1', 'scope2', 'scope3']
      };
      tokenService.save(newTokenWithScopes)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDbWithScopes = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find a token with scopes', function (done) {
      // changing the order of scopes array
      newTokenWithScopes.scopes = ['scope3', 'scope2', 'scope1'];

      tokenService.find(newTokenWithScopes)
      .then((token) => {
        token.should.eql(tokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token with scopes', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt', 'scopes'];
      let [ id, _tokenDecrypted ] = tokenFromDbWithScopes.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.scopes.should.eql(newTokenWithScopes.scopes);
        tokenObj.consumerId.should.eql(newTokenWithScopes.consumerId);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not create a new token with scopes if one exists and is not expired', function (done) {
      tokenService.findOrSave(newTokenWithScopes)
      .then((token) => {
        token.should.eql(tokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Delete Token tests', function () {
    let newToken, expiredToken, originalSystemConfig;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.access_tokens.timeToExpiry = 0;

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after((done) => {
      config.systemConfig.access_tokens.timeToExpiry = originalSystemConfig.access_tokens.timeToExpiry;
      done();
    });

    it('should save a token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        expiredToken = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not find an expired token', function (done) {
      tokenService.find(newToken)
      .then((token) => {
        should.not.exist(token);
        should.equal(token, null);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should create a new token if one is expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.should.not.eql(expiredToken);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should delete an expired token', function (done) {
      tokenService.get(expiredToken)
      .then((token) => {
        should.not.exist(token);
        should.equal(token, null);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });
});
