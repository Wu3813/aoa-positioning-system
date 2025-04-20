package com.wu.monitor.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ConcurrencyConfig implements WebMvcConfigurer {

    /**
     * 配置Tomcat服务器的并发参数
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return (factory) -> {
            // 设置最大连接数，最佳设置取决于服务器硬件配置
            factory.addConnectorCustomizers(connector -> {
                // 使用兼容的API方法
                connector.setAttribute("maxConnections", "10000"); // 设置最大连接数
                connector.setProperty("acceptCount", "1000"); // 设置等待队列长度
                connector.setProperty("maxThreads", "500"); // 最大工作线程数
                connector.setProperty("minSpareThreads", "50"); // 最小空闲线程数
                connector.setProperty("connectionTimeout", "30000"); // 连接超时（毫秒）
            });
        };
    }

    /**
     * 配置Spring MVC的异步执行器
     */
    @Bean
    public ThreadPoolTaskExecutor mvcTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(50); // 核心线程数
        executor.setMaxPoolSize(300); // 最大线程数
        executor.setQueueCapacity(1000); // 队列容量
        executor.setThreadNamePrefix("mvc-async-");
        executor.initialize();
        return executor;
    }

    /**
     * 配置异步请求处理
     */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setTaskExecutor(mvcTaskExecutor());
        configurer.setDefaultTimeout(30000); // 设置异步请求超时时间（毫秒）
    }
} 