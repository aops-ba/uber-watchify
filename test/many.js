var test = require('tape');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var split = require('split');

var cmd = path.resolve(__dirname, '../bin/cmd.js');
var os = require('os');
var tmpdir = path.join((os.tmpdir || os.tmpDir)(), 'watchify-' + Math.random());

var files = {
    main: path.join(tmpdir, 'main.js'),
    robot: path.join(tmpdir, 'robot.js'),
    lines: path.join(tmpdir, 'lines.txt'),
    bundle: path.join(tmpdir, 'bundle.js')
};

var edits = [
    { file: 'lines', source: 'robo-boogie' },
    { file: 'lines', source: 'dinosaurus rex' },
    { file: 'robot', source: 'module.exports = function (n) { return n * 111 }' },
    { file: 'main', source: [
        'var fs = require("fs");',
        'var robot = require("./robot.js");',
        'var src = fs.readFileSync(__dirname + "/lines.txt", "utf8");',
        'console.log(src.toUpperCase() + robot(src.length));'
    ].join('\n') },
    { file: 'lines', source: 't-rex' },
];

var expected = [
    'BEEP\nBOOP\n',
    'ROBO-BOOGIE\n',
    'DINOSAURUS REX\n',
    'T-REX\n5'
];

mkdirp.sync(tmpdir);
fs.writeFileSync(files.main, [
    'var fs = require("fs");',
    'var src = fs.readFileSync(__dirname + "/lines.txt", "utf8");',
    'console.log(src.toUpperCase());'
].join('\n'));
fs.writeFileSync(files.lines, 'beep\nboop');

test('many edits', function (t) {
    t.plan(10);
    var ps = spawn(cmd, [ files.main, '-t', 'brfs', '-o', files.bundle, '-v' ]);
    var lineNum = 0;
    ps.stderr.pipe(split()).on('data', function (line) {
        run(files.bundle, function (err, output) {
            t.ifError(err);
            t.equal(output, expected.shift());
            
            var edit = edits.shift();
            setTimeout(function () {
                fs.writeFile(files[edit.file], edit.source);
            }, 250);
        })
    });
    
    t.on('end', function () {
        ps.kill();
    });
});

function run (file, cb) {
    var ps = spawn(process.execPath, [ file ]);
    var data = [];
    ps.stdout.on('data', function (buf) { data.push(buf) });
    ps.stdout.on('end', function () {
        cb(null, Buffer.concat(data).toString('utf8'));
    });
    ps.on('error', cb);
    return ps;
}