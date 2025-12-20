const fs = require('fs');
const path = require('path');

function fixImports(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            fixImports(fullPath);
            continue;
        }
        
        if (!file.name.endsWith('.tsx') && !file.name.endsWith('.ts')) continue;
        
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('@/contexts/auth-new')) {
            content = content.replace(/@\/contexts\/auth-new/g, '@/contexts/auth');
            fs.writeFileSync(fullPath, content);
            console.log(`Fixed imports in: ${fullPath}`);
        }
    }
}

fixImports('D:\\Project\\TechPharma\\frontend');