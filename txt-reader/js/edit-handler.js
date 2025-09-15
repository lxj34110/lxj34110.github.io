let originalContent='';let chapters=[];let currentChapterIndex=0;function initEditFunctionality(chaptersData,currentIndex){chapters=chaptersData;currentChapterIndex=currentIndex;const editButton=document.getElementById('editChapter');const saveButton=document.getElementById('saveChapterEdit');const cancelButton=document.getElementById('cancelChapterEdit');const recallButton=document.getElementById('recallEdit');const recoverButton=document.getElementById('recoverEdit');const editControls=document.getElementById('editControls');const editStatus=document.getElementById('editStatus');const contentDiv=document.getElementById('content');let history=[];let historyIndex=-1;if(editButton){editButton.addEventListener('click',()=>{originalContent=contentDiv.textContent;contentDiv.contentEditable='true';contentDiv.classList.add('editing');editControls.style.display='block';editStatus.style.display='block';contentDiv.focus();editButton.textContent='✍';editButton.disabled=true;history=[originalContent];historyIndex=0;if(recallButton){recallButton.disabled=true}if(recoverButton){recoverButton.disabled=true}contentDiv.addEventListener('input',()=>{chapters[currentChapterIndex].content=contentDiv.textContent;if(typeof updateWordCount!=='undefined'){updateWordCount(currentChapterIndex)}if(historyIndex<history.length-1){history=history.slice(0,historyIndex+1)}history.push(contentDiv.textContent);historyIndex=history.length-1;if(recallButton){recallButton.disabled=historyIndex===0}if(recoverButton){recoverButton.disabled=historyIndex===history.length-1}})})}if(cancelButton){cancelButton.addEventListener('click',()=>{const stores=[{name:'books',keyPath:'name'}];window.indexedDBHelper.initDB('bookDB',6,stores).then(db=>{return window.indexedDBHelper.getDataByKey('bookDB','books',encodeURIComponent(bookName))}).then(result=>{if(result&&result.content){if(Array.isArray(result.content)){contentDiv.textContent=result.content[currentChapterIndex].content;chapters[currentChapterIndex].content=result.content[currentChapterIndex].content}else if(typeof result.content==='string'){const parsedChapters=window.readerFunctions.parseChapters(result.content);contentDiv.textContent=parsedChapters[currentChapterIndex].content;chapters[currentChapterIndex].content=parsedChapters[currentChapterIndex].content}}else{contentDiv.textContent=originalContent}contentDiv.contentEditable='false';contentDiv.classList.remove('editing');editControls.style.display='none';editStatus.style.display='none';editButton.textContent='✎';editButton.disabled=false;if(typeof updateWordCount!=='undefined'){updateWordCount(currentChapterIndex)}}).catch(error=>{console.error('从indexdb加载内容失败:',error);contentDiv.textContent=originalContent;contentDiv.contentEditable='false';contentDiv.classList.remove('editing');editControls.style.display='none';editStatus.style.display='none';editButton.textContent='✎';editButton.disabled=false})})}if(recallButton){recallButton.addEventListener('click',()=>{if(historyIndex>0){historyIndex--;contentDiv.textContent=history[historyIndex];chapters[currentChapterIndex].content=history[historyIndex];if(typeof updateWordCount!=='undefined'){updateWordCount(currentChapterIndex)}recallButton.disabled=historyIndex===0;if(recoverButton){recoverButton.disabled=false}}})}if(recoverButton){recoverButton.addEventListener('click',()=>{if(historyIndex<history.length-1){historyIndex++;contentDiv.textContent=history[historyIndex];chapters[currentChapterIndex].content=history[historyIndex];if(typeof updateWordCount!=='undefined'){updateWordCount(currentChapterIndex)}if(recallButton){recallButton.disabled=false}recoverButton.disabled=historyIndex===history.length-1}})}if(saveButton){saveButton.addEventListener('click',()=>{chapters[currentChapterIndex].content=contentDiv.textContent;if(typeof updateWordCount!=='undefined'){updateWordCount(currentChapterIndex)}contentDiv.contentEditable='false';contentDiv.classList.remove('editing');editControls.style.display='none';editStatus.style.display='none';editButton.textContent='✎';editButton.disabled=false;saveChapterAsTxt()})}}async function saveChapterAsTxt(){const contentElement=document.getElementById('content');let content=contentElement.innerText;content=content.replace(/<br\s*\/?>/gi,'\n').replace(/<div>/gi,'\n').replace(/<\/div>/gi,'');content=content.replace(/<[^>]*>/g,'').trim();if(!content){alert('无法保存空内容，请确保章节有文字内容后重试');return}const chapterTitle=chapters[currentChapterIndex].title;const cleanTitle=chapterTitle.replace(/[\\/:*?"<>|]/g, '');
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `${cleanTitle}+${dateTime}.txt`;

    try {
        // 尝试使用文件系统API保存文件
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Text Files',
                    accept: {'text/plain': ['.txt']},
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            showSaveNotification(fileName, true);
        } else {
            // 传统下载方式
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            // 使用合成鼠标事件提高移动端兼容性
            const event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            a.dispatchEvent(event);
            // 延长延迟至5秒，确保低速移动设备完成下载
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 5000);
            showSaveNotification(fileName, false);
        }
    } catch (error) {
        console.error('文件保存失败:', error);
        alert(`文件保存失败: ${error.message}\n\n请尝试以下解决方法:\n1. 检查浏览器存储权限\n2. 确保手机存储空间充足\n3. 手动创建/txt文件夹后重试\n4. 确认章节内容不为空`);
    }
}

function showSaveNotification(fileName, usedFileSystemAPI) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        let message;
        if (usedFileSystemAPI) {
            message = `章节内容已保存至:\n${fileName}\n\n提示: 文件已保存到您选择的位置\n您可以通过文件管理器查找此文件`;
        } else {
            message = `下载已启动，请检查默认下载文件夹:\n${fileName}\n\n提示: 传统下载方式无法确认保存状态，请确保:\n1. 浏览器允许来自此网站的下载\n2. 手机存储空间充足\n3. 查看浏览器默认下载路径\n\n故障排除:\n• 检查浏览器的"下载历史"页面\n• 在文件管理器中搜索"${fileName}"\n•确认浏览器弹出窗口阻止设置未阻止下载\n•尝试使用Chrome浏览器获得更好兼容性`}alert(message)}else{alert(`章节内容已保存至默认下载文件夹:${fileName}\n\n提示:现代浏览器支持选择保存位置，请使用Chrome、Edge或Firefox最新版本以获得更好体验。`)}}function updateWordCount(index){const text=chapters[index].content.trim();const wordCount=text.replace(/\s+/g,'').length;const wordCountElement=document.getElementById('chapterWordCount');if(wordCountElement){wordCountElement.textContent=`字数:${wordCount}`}}function saveChapterToIndexedDB(){if(!bookName||!chapters||chapters.length===0){console.error('无法保存章节内容: 缺少必要数据');return}const bookData={name:encodeURIComponent(bookName),content:chapters.map(chapter=>({title:chapter.title,content:chapter.content}))};const stores=[{name:'books',keyPath:'name'}];window.indexedDBHelper.initDB('bookDB',6,stores).then(db=>{return window.indexedDBHelper.updateData('bookDB','books',bookData)}).then(()=>{console.log('章节内容已保存到IndexedDB');alert('章节内容已保存到IndexedDB')}).catch(error=>{console.error('保存到IndexedDB失败:',error);alert('保存到IndexedDB失败: '+error.message)})}if(typeof module!=='undefined'&&module.exports){module.exports={initEditFunctionality,saveChapterAsTxt,showSaveNotification,updateWordCount,saveChapterToIndexedDB,chapters,currentChapterIndex}}if(typeof window!=='undefined'){window.editHandler={initEditFunctionality,saveChapterAsTxt,showSaveNotification,updateWordCount,saveChapterToIndexedDB,chapters,currentChapterIndex}}
