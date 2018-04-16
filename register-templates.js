#!/usr/bin/env node

// コマンドライン引数の解析
var program = require('commander');
program
    .version('1.0.0')
    .option('-r, --region [region]', 'Amazon SES region.', 'us-west-2')
    .parse(process.argv);
console.log(program);

var co = require('co');
var thunkify = require('thunkify');
var fs = require('fs');
var aws = require('aws-sdk');
var ses = new aws.SES({
    region: program.region
});
/**
 * カレントディレクトリの.jsonファイル一覧を取得する。
 * package.jsonおよびtestで始まるファイル名は除外される。
 */
var listJsonFiles = function* () {
    var readdir = thunkify(fs.readdir);
    var files = yield readdir('.');
    console.log('files:', files);
    return files.filter(f => {
        return /.*\.json$/.test(f) && !/^test.*\.json$/.test(f) && f != 'package.json';
    });
};
/**
 * Amazon SES上に登録されているテンプレートの一覧を取得する。
 */
var getExistsTemplates = function* () {
    var listTemplates = thunkify(ses.listTemplates.bind(ses));
    var response = yield listTemplates();
    console.log('response:', response);
    return response.TemplatesMetadata.map(meta => {
        return meta.Name;
    });
};
var readFile = function* (file) {
    var content = undefined;
    yield co(function* () {
        var readFile = thunkify(fs.readFile.bind(fs));
        content = yield readFile(file, 'utf8');
    }).catch(e => {
        console.log('error occurred.', e);
    });
    return content;
};
/**
 * JSON形式のテンプレートを読み込む。
 * テンプレートにTextPartが記載されていない場合は「テンプレート名.txt」を読み込んでその内容を設定する。
 * @param {string} file JSON形式のテンプレートファイル名
 */
var readTemplate = function* (file) {
    var template = JSON.parse(yield readFile(file, 'utf-8'));
    if (!template.Template.TextPart) {
        var text = yield readFile(template.Template.TemplateName + '.txt');
        if (text) {
            template.Template.TextPart = text;
        }
    }
    if (!template.Template.HtmlPart) {
        var html = yield readFile(template.Template.TemplateName + '.html');
        if (html) {
            template.Template.HtmlPart = html;
        }
    }
    template.Template.TemplateName = template.Template.TemplateName;
    return template;
};
co(function* () {
    var jsonFiles = yield listJsonFiles();
    console.log('json files:', jsonFiles);
    var existsTemplates = yield getExistsTemplates();
    console.log('existsTemplates:', existsTemplates);
    /**
     * JSONファイルをテンプレートとして登録する。
     * 既に存在していれば更新し、存在しなければ作成する。
     * @param {string} file JSONファイル名
     */
    var registerJson = function* (file) {
        console.log('register ', file);
        var template = yield readTemplate(file);
        console.log('template', template);
        var templateName = template.Template.TemplateName;
        if (existsTemplates.indexOf(templateName) < 0) {
            console.log('create', templateName);
            var createTemplate = thunkify(ses.createTemplate.bind(ses));
            var response = yield createTemplate(template);
            console.log('create result:', response);
        } else {
            console.log('update', templateName);
            var updateTemplate = thunkify(ses.updateTemplate.bind(ses));
            var response = yield updateTemplate(template);
            console.log('update result:', response);
        }
    };
    yield* jsonFiles.map(registerJson);
}).catch(e => {
    console.log('error:', e);
});