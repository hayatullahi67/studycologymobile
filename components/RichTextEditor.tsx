import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface RichTextEditorProps {
    initialValue?: string;
    onChange: (html: string) => void;
    placeholder?: string;
    height?: number;
    isDark?: boolean;
}

/**
 * A robust Rich Text Editor for React Native using Quill.js in a WebView.
 * Supports font sizes, font families, and all standard formatting.
 */
export function RichTextEditor({
    initialValue = '',
    onChange,
    placeholder = 'Start writing...',
    height = 400,
    isDark = false
}: RichTextEditorProps) {
    const webViewRef = useRef<WebView>(null);
    const hasSyncedRef = useRef(false);

    // Static HTML without the initial value to prevent reloads
    const editorHtml = React.useMemo(() => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: ${isDark ? '#050505' : '#ffffff'};
            color: ${isDark ? '#CBD5E1' : '#334155'};
            font-family: -apple-system, system-ui;
        }
        #editor {
            height: ${height - 65}px;
            border: none;
            font-size: 16px;
        }
        .ql-toolbar.ql-snow {
            border: none;
            border-bottom: 1px solid ${isDark ? 'rgba(230, 81, 0, 0.1)' : '#e2e8f0'};
            background-color: ${isDark ? '#0D0D0D' : '#f8fafc'};
            padding: 8px;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .ql-container.ql-snow {
            border: none;
            background-color: ${isDark ? '#050505' : '#ffffff'};
        }
        .ql-editor {
            background-color: ${isDark ? '#050505' : '#ffffff'};
        }
        .ql-editor.ql-blank::before {
            color: ${isDark ? '#475569' : '#94a3b8'};
            font-style: normal;
        }
        /* Toolbar Icon Colors - Custom Lava Theme */
        .ql-snow .ql-stroke { stroke: ${isDark ? '#CBD5E1' : '#475569'}; }
        .ql-snow .ql-fill { fill: ${isDark ? '#CBD5E1' : '#475569'}; }
        .ql-snow .ql-picker { color: ${isDark ? '#CBD5E1' : '#475569'}; }
        
        .ql-snow.ql-toolbar button:hover .ql-stroke, 
        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-fill {
            stroke: #E65100 !important;
            fill: #E65100 !important;
        }
        
        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active {
            color: #E65100 !important;
        }

        .ql-snow .ql-picker-options {
            background-color: ${isDark ? '#0D0D0D' : '#ffffff'} !important;
            border: 1px solid ${isDark ? 'rgba(230, 81, 0, 0.15)' : '#e2e8f0'} !important;
            border-radius: 8px;
            padding: 4px;
        }
        .ql-snow .ql-picker-item:hover,
        .ql-snow .ql-picker-item.ql-selected {
            color: #E65100 !important;
            background-color: ${isDark ? 'rgba(230, 81, 0, 0.1)' : 'rgba(230, 81, 0, 0.05)'} !important;
        }
    </style>
</head>
<body>
    <div id="editor"></div>
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script>
        var quill = new Quill('#editor', {
            theme: 'snow',
            placeholder: '${placeholder}',
            modules: {
                toolbar: [
                    [{ 'font': [] }],
                    [{ 'header': [1, 2, 3, 4, false] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // Communication
        quill.on('text-change', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'onTextChange',
                data: quill.root.innerHTML
            }));
        });

        window.addEventListener('message', function(event) {
            const message = JSON.parse(event.data);
            if (message.type === 'setValue') {
                quill.root.innerHTML = message.data;
            }
        });
    </script>
</body>
</html>
    `, [isDark, height, placeholder]);

    const syncInitialValue = () => {
        if (!hasSyncedRef.current && initialValue) {
            const script = `
                window.dispatchEvent(new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'setValue',
                        data: ${JSON.stringify(initialValue)}
                    })
                }));
            `;
            webViewRef.current?.injectJavaScript(script);
            hasSyncedRef.current = true;
        }
    };

    const handleMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'onTextChange') {
                onChange(message.data);
            }
        } catch (e) {
            // Fallback for legacy messages
            onChange(event.nativeEvent.data);
        }
    };

    return (
        <View style={[styles.container, { height, backgroundColor: isDark ? '#050505' : '#ffffff' }]}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: editorHtml }}
                onMessage={handleMessage}
                onLoadEnd={syncInitialValue}
                scrollEnabled={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator color="#E65100" />
                    </View>
                )}
                startInLoadingState={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: 'rgba(230, 81, 0, 0.1)',
        borderRadius: 16,
        overflow: 'hidden',
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
    }
});
