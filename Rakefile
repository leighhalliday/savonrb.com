require "rake"
require "open-uri"

namespace :jekyll do
  desc "Delete generated _site files"
  task :clean do
    sh "rm -fR _site"
  end

  desc "Run the jekyll dev server"
  task :server do
    sh "jekyll --server --auto"
  end

  desc "Clean temporary files and run the server"
  task :compile => [:clean, 'compass:clean', 'compass:compile'] do
    sh "jekyll"
  end
end

namespace :compass do
  desc "Delete temporary compass files"
  task :clean do
    sh "rm -fR css/*"
  end

  desc "Run the compass watch script"
  task :watch do
    sh "compass watch"
  end

  desc "Compile sass scripts"
  task :compile => [:clean] do
    sh "compass compile"
  end
end

task :update_changelog do
  changelog = URI("https://raw.github.com/savonrb/savon/master/CHANGELOG.md").read
  fail "no changelog" if changelog.nil? || changelog.empty?

  changelog.prepend("---
title: CHANGELOG
layout: default
---\n\n")

  File.open("changelog.md", "w") do |f|
    f << changelog
  end
end

desc "Deploy the website"
task :deploy => ["update_changelog", "jekyll:compile"] do
  begin
    require File.expand_path("deploy")
    Deployer.deploy!
  rescue LoadError
    puts "You're not allowed to deploy!"
  end
end
