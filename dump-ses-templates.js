// コマンドライン引数の解析
var program = require('commander');
program
    .version('1.0.0')
    .option('-r, --region [region]', 'Amazon SES region.', 'us-west-2')
    .option('-p, --pattern [pattern]', 'Pattern of template name.', '.*')
    .option('-d, --output-dir [directory]', 'Output directory.', '.')
    .option('-t, --text', 'Does output TextPart as text.', false)
    .parse(process.argv);
console.log(program);
var co = require('co');
var thunkify = require('thunkify');
var fs = require('fs');
var path = require('path');
var aws = require('aws-sdk');
var ses = new aws.SES({
    region: program.region
});
var pattern = new RegExp(program.pattern);

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
/**
 * ディレクトリが存在することを保証する。(なければ作成する)
 * @param {string} dir ディレクトリ名
 */
var ensureOutputDirectoryExists = function* (dir) {
    co(function* () {
        var mkdir = thunkify(fs.mkdir);
        yield mkdir(dir);
    }).catch(e => {
        if (e.code == 'EEXIST') {
            // nothing to do.
        } else {
            console.log('Error on mkdir.', e);
            throw e;
        }
    });
};
/**
 * テンプレートをファイルに書き出すジェネレータを返す。
 * @param {string} dir 出力先ディレクトリ
 * @param {boolean} text TextPartを.txtファイルに出力するか否か
 */
var dumpTemplate = function (dir, text) {
    var getTemplate = thunkify(ses.getTemplate.bind(ses));
    var writeFile = thunkify(fs.writeFile);
    return function* (name) {
        var outputPath = path.join(dir, name + '.json');
        console.log('dump', name, 'to', outputPath);
        var template = yield getTemplate({
            TemplateName: name
        });
        // console.log('template', template);
        console.log('json', JSON.stringify(template, null, 2));
        yield writeFile(outputPath, JSON.stringify(template, null, 2));
        if (text) {
            var textFile = path.join(dir, name + '.txt');
            console.log('Output TextPart as .txt to', textFile);
            yield writeFile(textFile, template.Template.TextPart);
        }
        console.log('complete.');
    };
}
co(function* () {
    var templateNames = yield getExistsTemplates();
    console.log('templateNames', templateNames);
    var targetTemplateNames = templateNames.filter(pattern.test.bind(pattern));
    console.log('targetTemplateNames', targetTemplateNames);
    yield ensureOutputDirectoryExists(program.outputDir);
    yield* targetTemplateNames.map(dumpTemplate(program.outputDir, program.text));
});