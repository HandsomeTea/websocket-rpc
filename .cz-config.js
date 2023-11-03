module.exports = {
    types: [{
        value: 'feat',
        name: '增加新功能'
    }, {
        value: 'fix',
        name: '修复bug'
    }, {
        value: 'docs',
        name: '变更文档'
    }, {
        value: 'refactor',
        name: '重构代码(不包括bug修复/功能新增)',
    }, {
        value: 'perf',
        name: '性能优化',
    }, {
        value: 'test',
        name: '添加/修改测试用例'
    }, {
        value: 'build',
        name: '变更构建流程/外部依赖(升级npm包/修改webpack配置/修改开发配置等)'
    }, {
        value: 'ci',
        name: '修改CI配置/脚本'
    }, {
        value: 'chore',
        name: '更改构建过程/辅助工具/库(不影响源文件/测试用例等其他操作)',
    }, {
        value: 'revert',
        name: '回滚'
    }, {
        value: 'WIP',
        name: '正在进行'
    }].map(a => {
        a.name = `  ${a.name}`
        return a;
    }),
    /** 自定义scope
     * 方法1：allowCustomScopes设置为true，会自动添加两个 scope 类型 [{ name: 'empty', value: false },{ name: 'custom', value: 'custom' }]
     * 方法2：在scopes项中添加value为custom的选项
     */
    // allowCustomScopes: true,
    scopes: [
        ['array', '数组相关'],
        ['crypto', '编码相关'],
        ['date', '日期相关'],
        ['number', '数值相关'],
        ['string', '字符串相关'],
        ['test', '测试相关'],
        ['deps', '项目依赖'],
        ['other', '其他'],
        // 如果选择 custom ,后面会让你再输入一个自定义的 scope , 也可以不设置此项， 把后面的 allowCustomScopes 设置为 true
        // ['custom', '自定义'],
    ].map(([value, description]) => {
        return {
            value,
            // name: `${value.padEnd(30)} (${description})`
            name: `${value}:${description}`
        };
    }),

    // allowTicketNumber: false,
    // isTicketNumberRequired: false,
    // ticketNumberPrefix: 'TICKET-',
    // ticketNumberRegExp: '\\d{1,5}',

    // 可以设置 scope 的类型跟 type 的类型匹配项，例如: 'fix'
    /*
      scopeOverrides: {
        fix: [
          { name: 'merge' },
          { name: 'style' },
          { name: 'e2eTest' },
          { name: 'unitTest' }
        ]
      },
     */
    // 覆写提示的信息
    messages: {
        type: "确保你的提交遵循了原子提交规范! 此次提交的变更属于:",
        // 如果自定义scope，可不选
        scope: '此次变更的影响范围:',
        // 选择 scope: custom 时会出下面的提示
        customScope: '(可选项)请输入此次变更的影响范围:',
        subject: '请输入此次变更的简述(标题):',
        // 关联breaklineChar
        body: '(可选项)请输入更加详细的描述(正文), 如新增功能/bug链接/截图链接等, 使用"|"换行:\n',
        breaking: '(可选项)请输入非兼容性重大的变更:',
        // 关联footerPrefix，breaklineChar
        footer: '(可选项)请输入此次变更涉及的已关闭的issue编号, 如: #31, #34, 使用"|"换行:\n',
        confirmCommit: '确认提交?',
    },

    allowBreakingChanges: ['feat', 'fix'],
    // skip any questions you want
    skipQuestions: ['breaking'],

    // subject 限制长度
    subjectLimit: 100,
    breaklineChar: '|', // 支持 body 和 footer
    footerPrefix: 'ISSUES CLOSED:'
    // askForBreakingChangeFirst : true,
};
